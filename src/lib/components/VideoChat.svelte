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

<div class="fixed inset-0 z-50 {isCallActive ? '' : 'pointer-events-none'}">
    {#if isCallActive}
        <div class="h-full flex flex-col bg-gray-950">
            <!-- Remote Video -->
            <div class="relative flex-1 w-full bg-black">
                <video 
                    bind:this={remoteVideo} 
                    autoplay 
                    playsinline 
                    class="w-full h-full object-cover"
                >
                    <track kind="captions">
                </video>

                <!-- Call Info Overlay -->
                <div class="absolute top-0 inset-x-0 p-4 flex justify-between items-start">
                    <!-- Duration -->
                    <div class="bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm">
                        <span class="text-white/90 text-sm font-medium">{formatDuration(callDuration)}</span>
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

                <!-- Local Video - Picture in Picture -->
                <div class="absolute top-4 right-4 w-[30%] max-w-[200px] aspect-video rounded-lg overflow-hidden bg-black/20 shadow-lg cursor-move touch-none">
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

                <!-- Controls Overlay -->
                <div class="absolute bottom-0 inset-x-0 p-4 flex justify-center">
                    <div class="flex items-center gap-3 md:gap-6 bg-black/70 px-4 md:px-8 py-3 rounded-full backdrop-blur-sm">
                        <!-- Mute Button -->
                        <button 
                            on:click={toggleMute}
                            class="flex flex-col items-center gap-1 group"
                        >
                            <div class="p-2.5 md:p-3.5 rounded-full {isMuted ? 'bg-red-500/20' : 'bg-gray-700/50'} group-hover:bg-gray-600/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {isMuted ? 'text-red-500' : 'text-white'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isMuted ? "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" : "M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.364l-4.243 4.243-1.414-1.414L12 15.414l4.243 4.243-1.414 1.414L12 18.364z"} />
                                </svg>
                            </div>
                            <span class="text-[10px] md:text-xs text-white/80">{isMuted ? 'Unmute' : 'Mute'}</span>
                        </button>

                        <!-- Video Toggle -->
                        <button 
                            on:click={toggleVideo}
                            class="flex flex-col items-center gap-1 group"
                        >
                            <div class="p-2.5 md:p-3.5 rounded-full {!isVideoEnabled ? 'bg-red-500/20' : 'bg-gray-700/50'} group-hover:bg-gray-600/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {!isVideoEnabled ? 'text-red-500' : 'text-white'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={!isVideoEnabled ? "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z M3 3l18 18" : "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"} />
                                </svg>
                            </div>
                            <span class="text-[10px] md:text-xs text-white/80">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
                        </button>

                        <!-- End Call -->
                        <button 
                            on:click={endCall}
                            class="flex flex-col items-center gap-1 group"
                        >
                            <div class="p-2.5 md:p-3.5 rounded-full bg-red-500/20 group-hover:bg-red-600/30 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5z" />
                                </svg>
                            </div>
                            <span class="text-[10px] md:text-xs text-red-500">End Call</span>
                        </button>
                    </div>
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