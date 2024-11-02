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

            peerConnection.ontrack = (event) => {
                remoteStream = event.streams[0];
                if (remoteVideo) {
                    remoteVideo.srcObject = remoteStream;
                }
            };

            peerConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    const chatRef = doc(db, 'chats', chatId);
                    await updateDoc(chatRef, {
                        [`videoCall.candidates.${userId}`]: arrayUnion(event.candidate.toJSON())
                    });
                }
            };

            peerConnection.onconnectionstatechange = () => {
                connectionState = peerConnection.connectionState;
                if (connectionState === 'disconnected') {
                    attemptReconnection();
                } else if (connectionState === 'connected') {
                    reconnectAttempts = 0;
                }
            };

            return peerConnection;
        } catch (err) {
            throw err;
        }
    }

    // Export the methods that need to be called from parent
    export function startCall() {
        return handleStartCall();
    }

    // Rename the existing startCall to handleStartCall
    async function handleStartCall() {
        isLoading = true;
        try {
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
        } catch (error) {
            console.error('Error starting call:', error);
            await cleanupCall();
        } finally {
            isLoading = false;
        }
    }

    async function handleIncomingCall(callData) {
        try {
            // Don't process old call data
            if (currentCallData?.timestamp && callData.timestamp < currentCallData.timestamp) {
                return;
            }

            // Store the current call data
            currentCallData = callData;

            switch (callData.status) {
                case 'pending':
                    if (callData.recipient === userId && !isCallActive) {
                        showIncomingCallDialog = true;
                        isCallPending = true;
                        isCallActive = false;
                    } else if (callData.caller === userId) {
                        isCallPending = true;
                        isCallActive = true;
                    }
                    break;

                case 'active':
                    showIncomingCallDialog = false;
                    isCallActive = true;
                    isCallPending = false;

                    if (callData.caller === userId && 
                        callData.answer && 
                        peerConnection?.signalingState === 'have-local-offer') {
                        try {
                            await peerConnection.setRemoteDescription(
                                new RTCSessionDescription(callData.answer)
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
                    await cleanupCall(true);
                    return;
            }

            if (callData.candidates && peerConnection) {
                const otherParty = userId === callData.caller ? callData.recipient : callData.caller;
                const candidates = callData.candidates[otherParty];
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
        } catch (err) {
            await cleanupCall();
        }
    }

    async function acceptCall() {
        try {
            showIncomingCallDialog = false;
            
            if (!currentCallData?.offer) {
                console.error('No offer found in current call data');
                return;
            }

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

            const updatedCallData = {
                ...currentCallData,
                answer: {
                    type: answer.type,
                    sdp: answer.sdp
                },
                status: 'active',
                timestamp: Date.now()
            };

            await updateDoc(doc(db, 'chats', chatId), {
                videoCall: updatedCallData
            });
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
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            remoteStream = null;
        }

        isCallActive = false;
        isCallPending = false;
        showIncomingCallDialog = false;
        
        if (callTimer) {
            clearInterval(callTimer);
            callTimer = null;
        }
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
                            <!-- Mute button -->
                            <button
                                on:click={toggleMute}
                                class="p-2.5 rounded-full hover:bg-gray-700/50 transition-colors"
                            >
                                {#if isMuted}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd" />
                                    </svg>
                                {/if}
                            </button>

                            <!-- Video toggle button -->
                            <button
                                on:click={toggleVideo}
                                class="p-2.5 rounded-full hover:bg-gray-700/50 transition-colors"
                            >
                                {#if !isVideoEnabled}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                        <path d="M14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                        <path d="M14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                {/if}
                            </button>

                            <!-- End call button -->
                            <button
                                on:click={endCall}
                                class="p-2.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                            </button>
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