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
    let callDuration = 0;
    let callTimer;
    let connectionState = 'new';
    
    // Add reconnection variables
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    
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

    // Add loading state
    let isLoading = false;

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
                connectionState = peerConnection.connectionState;
                if (connectionState === 'disconnected') {
                    attemptReconnection();
                } else if (connectionState === 'connected') {
                    reconnectAttempts = 0; // Reset attempts on successful connection
                }
            };

            return peerConnection;
        } catch (err) {
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
        isLoading = true;
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
        } finally {
            isLoading = false;
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

                    if (!callTimer) {
                        startCallTimer();
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
                            // Remove console.error
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
        
        if (callTimer) {
            clearInterval(callTimer);
            callTimer = null;
            callDuration = 0;
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

    function startCallTimer() {
        callDuration = 0;
        callTimer = setInterval(() => {
            callDuration++;
        }, 1000);
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Add reconnection function
    async function attemptReconnection() {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            await endCall();
            return;
        }
        
        reconnectAttempts++;
        
        try {
            await cleanupCall(false);
            await handleStartCall();
        } catch (error) {
            setTimeout(attemptReconnection, 2000);
        }
    }

    onMount(() => {
        const unsubscribe = onSnapshot(doc(db, 'chats', chatId), (doc) => {
            const data = doc.data();
            if (data?.videoCall) {  // Only handle videoCall updates
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

<div class="fixed inset-0 {isCallActive ? 'z-50' : 'pointer-events-none opacity-0'}">
    {#if isCallActive}
        <div class="absolute inset-0 flex flex-col bg-gray-950">
            <!-- Update the video container -->
            <div class="relative w-full h-full bg-black overflow-hidden">
                <video 
                    bind:this={remoteVideo} 
                    autoplay 
                    playsinline 
                    class="absolute inset-0 w-full h-full object-cover"
                >
                    <track kind="captions">
                </video>

                <!-- Update the controls container to ensure it stays visible -->
                <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <!-- Top controls -->
                    <div class="p-4 flex justify-between items-start pointer-events-auto">
                        <!-- Duration -->
                        <div class="bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm">
                            <span class="text-white/90 text-sm font-medium">
                                {formatDuration(callDuration)}
                            </span>
                        </div>
                        <!-- Connection Status -->
                        <div class="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <div class="w-2 h-2 rounded-full {
                                connectionState === 'connected' ? 'bg-green-500' :
                                connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                'bg-red-500'
                            }"></div>
                            <span class="text-white/90 text-xs capitalize">{connectionState}</span>
                        </div>
                    </div>

                    <!-- Bottom controls -->
                    <div class="p-4 flex justify-center pointer-events-auto">
                        <div class="flex items-center gap-3 md:gap-6 bg-black/70 px-4 md:px-8 py-3 rounded-full backdrop-blur-sm">
                            <!-- Existing control buttons -->
                        </div>
                    </div>
                </div>

                <!-- Local video PiP -->
                <div class="absolute top-4 right-4 w-[30%] max-w-[200px] aspect-video rounded-lg overflow-hidden bg-black/20 shadow-lg pointer-events-auto">
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
        </div>
    {/if}
</div>

<style>
    /* Add any additional styles here */
</style>

<!-- Loading overlay remains outside -->
{#if isLoading}
    <div class="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
        <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-white/90">Connecting...</span>
        </div>
    </div>
{/if}