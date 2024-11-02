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

    async function startCall() {
        isCallPending = true;
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
                status: 'pending'
            }
        });
    }

    async function handleIncomingCall(videoCallData) {
        try {
            currentCallData = videoCallData;
            
            if (videoCallData.status === 'pending' && 
                videoCallData.caller !== userId && 
                videoCallData.recipient === userId) {
                showIncomingCallDialog = true;
            } else if (videoCallData.status === 'active') {
                showIncomingCallDialog = false;
                
                // If we're the caller and we have an answer, set up the connection
                if (videoCallData.caller === userId && videoCallData.answer) {
                    if (!peerConnection) {
                        console.error('No peer connection found for caller');
                        return;
                    }
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(videoCallData.answer));
                }
                
                isCallActive = true;
                isCallPending = false;
            } else if (videoCallData.status === 'rejected' || videoCallData.status === 'ended') {
                await cleanupCall();
            }

            // Handle ICE candidates
            if (videoCallData.candidates) {
                const otherParty = userId === videoCallData.caller ? videoCallData.recipient : videoCallData.caller;
                const candidates = videoCallData.candidates[otherParty];
                if (peerConnection && candidates) {
                    for (const candidate of candidates) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error handling incoming call:', error);
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
            
            // Setup media devices first
            await setupMediaDevices();
            
            // Create and configure peer connection
            peerConnection = createPeerConnection();
            
            // Add local tracks to peer connection
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
            }

            // Set remote description (offer) first
            await peerConnection.setRemoteDescription(new RTCSessionDescription(currentCallData.offer));
            
            // Create and set local description (answer)
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // Update Firestore with the answer
            await updateDoc(doc(db, 'chats', chatId), {
                videoCall: {
                    ...currentCallData,
                    answer: {
                        type: answer.type,
                        sdp: answer.sdp
                    },
                    status: 'active'
                }
            });
            
            isCallActive = true;
            isCallPending = false;

        } catch (error) {
            console.error('Error accepting call:', error);
            await cleanupCall();
            // Optionally show an error message to the user
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

    async function cleanupCall() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
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
    }

    async function endCall() {
        await updateDoc(doc(db, 'chats', chatId), {
            videoCall: {
                status: 'ended'
            }
        });
        
        await cleanupCall();
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

<div class="flex items-center">
    {#if !isCallActive && !isCallPending}
        <button
            on:click={startCall}
            class="text-gray-400 hover:text-emerald-400 p-2 rounded-full transition-colors"
            title="Start video call"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        </button>
    {/if}

    {#if showIncomingCallDialog}
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-gray-800 p-6 rounded-lg shadow-xl">
                <h3 class="text-lg font-medium text-white mb-4">Incoming Video Call</h3>
                <div class="flex gap-4">
                    <button
                        on:click={acceptCall}
                        class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg"
                    >
                        Accept
                    </button>
                    <button
                        on:click={rejectCall}
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    {/if}

    {#if isCallActive || isCallPending}
        <div class="fixed top-24 right-4 bg-zinc-800 rounded-lg shadow-lg p-4 w-80 z-50">
            <video
                bind:this={localVideo}
                autoplay
                playsinline
                muted
                class="w-full rounded-lg mb-2"
            >
                <track kind="captions" label="English" src="" default />
            </video>
            
            <video
                bind:this={remoteVideo}
                autoplay
                playsinline
                class="w-full rounded-lg mb-2"
            >
                <track kind="captions" label="English" src="" default />
            </video>

            <button
                on:click={endCall}
                class="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
            >
                End Call
            </button>
        </div>
    {/if}
</div>