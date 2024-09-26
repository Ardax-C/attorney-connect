<script>
    import { onMount, afterUpdate } from 'svelte';
    import { page } from '$app/stores';
    import { db, auth } from '$lib/firebase';
    import { doc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
    import { requireAuth } from '$lib/auth.js';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';

    export let chatId;

    let messages = [];
    let newMessage = '';
    let chatContainer;
    let user = null;
    let loading = true;
    let error = null;
    let otherParticipantName = "Attorney";

    onMount(async () => {
        try {
            user = await requireAuth();
            if (chatId) {
                loadChat();
            }
        } catch (error) {
            loading = false;
            error = 'Authentication error. Please log in and try again.';
        }
    });

    async function loadChat() {
        const chatRef = doc(db, 'chats', chatId);
        const messagesRef = collection(chatRef, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            loading = false;
        }, (err) => {
            error = 'Error loading messages. Please try again later.';
            loading = false;
        });

        // Load chat details to get the other participant
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            const otherParticipantId = chatData.participants.find(id => id !== user.uid);
            if (otherParticipantId) {
                const attorneyDoc = await getDoc(doc(db, 'attorneyProfiles', otherParticipantId));
                if (attorneyDoc.exists()) {
                    const attorneyData = attorneyDoc.data();
                    otherParticipantName = `${attorneyData.firstName} ${attorneyData.lastName}`;
                } else {
                    otherParticipantName = "Unknown Attorney";
                }
            } else {
                otherParticipantName = "Unknown Participant";
            }
        }

        return unsubscribe;
    }

    afterUpdate(() => {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    async function sendMessage() {
        if (newMessage.trim() === '') return;

        try {
            const chatRef = doc(db, 'chats', chatId);
            const messagesRef = collection(chatRef, 'messages');

            await addDoc(messagesRef, {
                content: newMessage.trim(),
                senderId: user.uid,
                timestamp: serverTimestamp()
            });

            // Update the last message in the chat document
            await updateDoc(chatRef, {
                lastMessage: newMessage.trim(),
                lastMessageTimestamp: serverTimestamp()
            });

            newMessage = '';
        } catch (err) {
            error = 'Error sending message. Please try again.';
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
</script>


<main class="bg-no-repeat bg-center bg-cover fixed inset-0 flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="flex-grow container mx-auto p-4 flex flex-col overflow-hidden">
        <div class="bg-gray-900 rounded-md flex flex-col h-full">
            <h1 class="text-custom-color-tertiary text-2xl font-bold p-4">Chat with {otherParticipantName}</h1>
            {#if loading}
                <p class="text-emerald-400 p-4">Loading chat...</p>
            {:else if error}
                <p class="text-red-500 p-4">{error}</p>
            {:else}
                <div class="flex-grow flex flex-col overflow-hidden">
                    <div class="flex-grow overflow-y-auto p-4 bg-zinc-800" bind:this={chatContainer}>
                        {#each messages as message}
                            <div class="mb-4 {message.senderId === user.uid ? 'text-right' : 'text-left'}">
                                <p class="inline-block bg-zinc-700 text-custom-color-tertiary rounded-lg p-2 max-w-xs break-words">
                                    {message.content}
                                </p>
                                <p class="text-xs text-gray-500 mt-1">
                                    {message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString() : 'Sending...'}
                                </p>
                            </div>
                        {/each}
                    </div>
                    <div class="p-4 border-t border-gray-300 bg-gray-900">
                        <textarea
                            class="w-full p-2 border border-gray-300 rounded bg-zinc-700 text-emerald-400"
                            rows="3"
                            placeholder="Type your message..."
                            bind:value={newMessage}
                            on:keypress={handleKeyPress}
                        ></textarea>
                        <button
                            class="bg-custom-btn-bg text-custom-btn-text font-inter py-2 px-4 rounded-sm border-none text-base sm:text-lg cursor-pointer transition duration-300 ease-in-out transform hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text active:scale-95 mt-2"
                            on:click={sendMessage}
                        >
                            Send
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }

    main {
        padding-top: 64px; /* Adjust this value based on your Navbar height */
    }
</style>