<script>
    import { onMount, onDestroy } from 'svelte';
    import { db } from '$lib/firebase';
    import { doc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
    
    export let chatId;
    export let userId;
    export let otherParticipantId;
    
    let localStream;
    let remoteStream;
    let peerConnection;
    let localVideo;
    let remoteVideo;
    let isCallActive = false;
    let isCallPending = false;
    let showIncomingCallDialog = false;
    let currentCallData = null;
    let isMuted = false;
    let isVideoEnabled = true;
    
    const servers = {
        iceServers: [
            {
                urls: [
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302'
                ]
            }
        ]
    };

    async function setupMediaDevices() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            if (localVideo) {
                localVideo.srcObject = localStream;
            }
        } catch (err) {
            console.error('Error accessing media devices:', err);
            throw err;
        }
    }

    function createPeerConnection() {
        try {
            peerConnection = new RTCPeerConnection(servers);

            // Handle incoming tracks
            peerConnection.ontrack = (event) => {
                remoteStream = event.streams[0];
                if (remoteVideo) {
                    remoteVideo.srcObject = remoteStream;
                }
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    const chatRef = doc(db, 'chats', chatId);
                    await updateDoc(chatRef, {
                        [`videoCall.candidates.${userId}`]: arrayUnion(event.candidate.toJSON())
                    });
                }
            };

            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                if (peerConnection.connectionState === 'disconnected') {
                    endCall();
                }
            };

            return peerConnection;
        } catch (err) {
            console.error('Error creating peer connection:', err);
            throw err;
        }
    }

    // Add debug logging
    function logCallState(location) {
        console.log(`[${location}] Call State:`, {
            isCallActive,
            isCallPending,
            showIncomingCallDialog,
            hasLocalStream: !!localStream,
            hasPeerConnection: !!peerConnection,
            userId,
            isCaller: currentCallData?.caller === userId
        });
    }

    // Export the methods that need to be called from parent
    export function startCall() {
        return handleStartCall();
    }

    // Rename the existing startCall to handleStartCall
    async function handleStartCall() {
        try {
            console.log('Starting call as caller');
            isCallPending = true;
            isCallActive = true;
            await setupMediaDevices();
            createPeerConnection();
            
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            await updateDoc(doc(db, 'chats', chatId), {
                videoCall: {
                    offer: {
                        type: offer.type,
                        sdp: offer.sdp
                    },
                    caller: userId,
                    recipient: otherParticipantId,
                    status: 'pending',
                    timestamp: Date.now()
                }
            });
            logCallState('startCall-end');
        } catch (error) {
            console.error('Error starting call:', error);
            await cleanupCall();
        }
    }

    async function handleIncomingCall(videoCallData) {
        try {
            console.log('Handling call update:', videoCallData);
            
            // Don't process old call data
            if (currentCallData?.timestamp && videoCallData.timestamp < currentCallData.timestamp) {
                console.log('Ignoring older call state update');
                return;
            }

            // Store the current call data
            currentCallData = videoCallData;

            switch (videoCallData.status) {
                case 'pending':
                    if (videoCallData.recipient === userId) {
                        console.log('Recipient: Showing incoming call dialog');
                        showIncomingCallDialog = true;
                    } else if (videoCallData.caller === userId) {
                        console.log('Caller: Maintaining pending state');
                        isCallPending = true;
                        isCallActive = true;
                    }
                    break;

                case 'active':
                    console.log('Call is active');
                    showIncomingCallDialog = false;
                    isCallActive = true;
                    isCallPending = false;

                    // For caller: Handle answer only once
                    if (videoCallData.caller === userId && 
                        videoCallData.answer && 
                        peerConnection?.signalingState === 'have-local-offer') {
                        console.log('Caller: Processing answer');
                        try {
                            await peerConnection.setRemoteDescription(
                                new RTCSessionDescription(videoCallData.answer)
                            );
                        } catch (error) {
                            if (!error.message.includes('Cannot set remote answer in state stable')) {
                                throw error;
                            }
                        }
                    }
                    break;

                case 'rejected':
                case 'ended':
                    console.log('Call ended or rejected');
                    await cleanupCall(true); // Force cleanup
                    return;
            }

            // Handle ICE candidates
            if (videoCallData.candidates && peerConnection) {
                const otherParty = userId === videoCallData.caller ? videoCallData.recipient : videoCallData.caller;
                const candidates = videoCallData.candidates[otherParty];
                if (candidates) {
                    for (const candidate of candidates) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    }
                }
            }

            logCallState('handleIncomingCall-end');
        } catch (error) {
            console.error('Error handling incoming call:', error);
            if (!isCallActive) {
                await cleanupCall(true);
            }
        }
    }

    async function acceptCall() {
        try {
            console.log('Accepting call as recipient');
            showIncomingCallDialog = false;
            
            if (!currentCallData?.offer) {
                console.error('No offer found in current call data');
                return;
            }

            // Set states before media setup
            isCallActive = true;
            isCallPending = false;
            
            await setupMediaDevices();
            createPeerConnection();
            
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
            }

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(currentCallData.offer)
            );
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // Keep all existing call data when updating
            const updatedCallData = {
                ...currentCallData,
                answer: {
                    type: answer.type,
                    sdp: answer.sdp
                },
                status: 'active',
                timestamp: Date.now()
            };

            // Update Firestore with the complete call data
            await updateDoc(doc(db, 'chats', chatId), {
                videoCall: updatedCallData
            });
            
            logCallState('acceptCall-end');
        } catch (error) {
            console.error('Error accepting call:', error);
            await cleanupCall();
        }
    }

    async function rejectCall() {
        showIncomingCallDialog = false;
        await updateDoc(doc(db, 'chats', chatId), {
            videoCall: {
                ...currentCallData,
                status: 'rejected'
            }
        });
        await cleanupCall();
    }

    async function cleanupCall(force = false) {
        console.log('Cleaning up call');
        
        // Only cleanup if we're not in an active call or if forced
        if (!force && isCallActive && currentCallData?.status === 'active') {
            console.log('Skipping cleanup for active call');
            return;
        }

        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
            });
        }
        if (peerConnection) {
            peerConnection.close();
        }
        
        localStream = null;
        remoteStream = null;
        peerConnection = null;
        isCallActive = false;
        isCallPending = false;
        showIncomingCallDialog = false;
        currentCallData = null;
        
        logCallState('cleanupCall-end');
    }

    async function endCall() {
        await updateDoc(doc(db, 'chats', chatId), {
            videoCall: {
                status: 'ended'
            }
        });
        
        await cleanupCall();
    }

    function toggleMute() {
        isMuted = !isMuted;
        localStream?.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
    }

    function toggleVideo() {
        isVideoEnabled = !isVideoEnabled;
        localStream?.getVideoTracks().forEach(track => {
            track.enabled = isVideoEnabled;
        });
    }

    onMount(() => {
        const unsubscribe = onSnapshot(doc(db, 'chats', chatId), (doc) => {
            const data = doc.data();
            if (data?.videoCall) {
                handleIncomingCall(data.videoCall);
            }
        });

        return () => {
            unsubscribe();
            cleanupCall();
        };
    });
</script>

<div class="fixed right-4 bottom-20 w-full max-w-[300px] z-50 flex flex-col gap-4 md:right-4 md:bottom-20 sm:right-2 sm:bottom-16 sm:max-w-[160px]">
    {#if isCallActive}
        <!-- Remote Video -->
        <div class="relative w-full aspect-video sm:aspect-[3/4] rounded-lg overflow-hidden bg-black/20">
            <video 
                bind:this={remoteVideo} 
                autoplay 
                playsinline 
                class="w-full h-full object-cover"
            >
                <track kind="captions">
            </video>
        </div>

        <!-- Local Video -->
        <div class="relative w-full aspect-video sm:aspect-[3/4] sm:w-20 sm:absolute sm:bottom-4 sm:right-4 rounded-lg overflow-hidden bg-black/20">
            <video 
                bind:this={localVideo} 
                autoplay 
                playsinline 
                muted
                class="w-full h-full object-cover"
            >
                <track kind="captions">
            </video>
        </div>

        <!-- Video Controls -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 px-2 py-1 rounded-full z-[51]">
            <button 
                on:click={toggleMute}
                class="bg-transparent border-none text-white cursor-pointer p-1 hover:bg-black/30 rounded-full"
            >
                {isMuted ? '🔇' : '🔊'}
            </button>
            <button 
                on:click={toggleVideo}
                class="bg-transparent border-none text-white cursor-pointer p-1 hover:bg-black/30 rounded-full"
            >
                {isVideoEnabled ? '📹' : '🚫'}
            </button>
            <button 
                on:click={endCall}
                class="bg-transparent border-none cursor-pointer p-1 hover:bg-black/30 rounded-full text-red-500"
            >
                📞
            </button>
        </div>
    {/if}
</div>