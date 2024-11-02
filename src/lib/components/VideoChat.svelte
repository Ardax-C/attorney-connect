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
                    if (videoCallData.recipient === userId && !isCallActive) {
                        console.log('Recipient: Showing incoming call dialog');
                        showIncomingCallDialog = true;
                        // Ensure these are set correctly for the recipient
                        isCallPending = true;
                        isCallActive = false;
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
            await cleanupCall();
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
        
        if (force) {
            try {
                await updateDoc(doc(db, 'chats', chatId), {
                    videoCall: {
                        status: 'ended'
                    }
                });
            } catch (error) {
                console.error('Error updating call status during cleanup:', error);
            }
        }
        
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

{#if showIncomingCallDialog}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 class="text-xl font-semibold text-white mb-4">Incoming Call</h3>
            <div class="flex justify-center gap-4">
                <button
                    on:click={acceptCall}
                    class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                    Accept
                </button>
                <button
                    on:click={rejectCall}
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                    Decline
                </button>
            </div>
        </div>
    </div>
{/if}

<div class="fixed right-4 bottom-4 flex flex-col gap-4 z-50 {isCallActive ? 'desktop:right-8 desktop:bottom-8' : ''}">
    {#if isCallActive}
        <!-- Main call container for desktop -->
        <div class="flex flex-col desktop:flex-row gap-4">
            <!-- Remote Video -->
            <div class="relative w-[300px] desktop:w-[480px] aspect-video rounded-lg overflow-hidden bg-black/20 shadow-lg">
                <video 
                    bind:this={remoteVideo} 
                    autoplay 
                    playsinline 
                    class="w-full h-full object-cover"
                >
                    <track kind="captions">
                </video>
                
                <!-- Video Controls - Moved inside remote video container -->
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 px-4 py-2 rounded-full">
                    <button 
                        on:click={toggleMute}
                        class="bg-transparent border-none text-white cursor-pointer p-2 hover:bg-black/30 rounded-full transition-colors"
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    <button 
                        on:click={toggleVideo}
                        class="bg-transparent border-none text-white cursor-pointer p-2 hover:bg-black/30 rounded-full transition-colors"
                    >
                        {isVideoEnabled ? '📹' : '🚫'}
                    </button>
                    <button 
                        on:click={endCall}
                        class="bg-transparent border-none cursor-pointer p-2 hover:bg-black/30 rounded-full text-red-500 transition-colors"
                    >
                        📞
                    </button>
                </div>
            </div>

            <!-- Local Video -->
            <div class="relative w-[120px] aspect-video rounded-lg overflow-hidden bg-black/20 shadow-lg desktop:self-start">
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
        </div>
    {/if}
</div>

<style>
    /* Add these styles to ensure proper desktop layout */
    @media (min-width: 1024px) {
        :global(.desktop\:right-8) {
            right: 2rem;
        }
        :global(.desktop\:bottom-8) {
            bottom: 2rem;
        }
        :global(.desktop\:w-\[480px\]) {
            width: 480px;
        }
        :global(.desktop\:flex-row) {
            flex-direction: row;
        }
        :global(.desktop\:self-start) {
            align-self: flex-start;
        }
    }
</style>