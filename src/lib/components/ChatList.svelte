<script>
    import { onMount } from 'svelte';
    import { db } from '$lib/firebase';
    import { collection, query, where, orderBy, onSnapshot, getDoc, doc, updateDoc, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
    import { goto } from '$app/navigation';
    import { requireAuth } from '$lib/auth.js';
    import backgroundImage from '$lib/images/pexels-lastly-2086917.jpg';
	import Navbar from './Navbar.svelte';

    let chats = [];
    let loading = true;
    let error = null;
    let user = null;

    onMount(async () => {
        try {
            user = await requireAuth();
            loadChats();
        } catch (error) {
            loading = false;
            error = 'Authentication error. Please log in and try again.';
        }
    });

    async function loadChats() {
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('participants', 'array-contains', user.uid),
            orderBy('lastMessageTimestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatPromises = snapshot.docs.map(async (chatDoc) => {
                const chatData = chatDoc.data();
                const otherParticipantId = chatData.participants.find(id => id !== user.uid);
                
                if (!otherParticipantId) {
                    return {
                        id: chatDoc.id,
                        ...chatData,
                        otherParticipantName: 'Unknown Participant'
                    };
                }

                try {
                    const attorneyDoc = await getDoc(doc(db, 'attorneyProfiles', otherParticipantId));
                    if (attorneyDoc.exists()) {
                        const attorneyData = attorneyDoc.data();
                        return {
                            id: chatDoc.id,
                            ...chatData,
                            otherParticipantName: `${attorneyData.firstName} ${attorneyData.lastName}`
                        };
                    } else {
                        return {
                            id: chatDoc.id,
                            ...chatData,
                            otherParticipantName: 'Unknown Attorney'
                        };
                    }
                } catch (error) {
                    return {
                        id: chatDoc.id,
                        ...chatData,
                        otherParticipantName: 'Error Fetching Name'
                    };
                }
            });

            chats = await Promise.all(chatPromises);
            loading = false;
        }, (err) => {
            error = 'Error loading chats. Please try again later.', err;
            loading = false;
        });

        return unsubscribe;
    }

    function navigateToChat(chatId) {
        goto(`/chat/${chatId}`);
    }

    async function deleteChat(chat, event) {
        event.stopPropagation();
        if (!confirm(`Are you sure you want to delete this chat with ${chat.otherParticipantName}?`)) {
            return;
        }

        try {
            const chatRef = doc(db, 'chats', chat.id);
            
            // Remove the current user from the participants array
            await updateDoc(chatRef, {
                participants: arrayRemove(user.uid)
            });

            // Add a message indicating the user has left the chat
            const messagesRef = collection(chatRef, 'messages');
            await addDoc(messagesRef, {
                content: `The other user has left the conversation.`,
                senderId: 'system',
                timestamp: serverTimestamp()
            });

            // Update the last message in the chat document
            await updateDoc(chatRef, {
                lastMessage: `The other user has left the conversation.`,
                lastMessageTimestamp: serverTimestamp()
            });

            // Remove the chat from the local array
            chats = chats.filter(c => c.id !== chat.id);
            error = null; // Clear any previous error messages
        } catch (err) {
            console.error('Error deleting chat:', err);
            error = 'Error deleting chat. Please try again.';
        }
    }
</script>

<main class="bg-no-repeat bg-center bg-cover fixed inset-0 flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="flex-grow container mx-auto p-4 flex flex-col overflow-hidden">
        <div class="bg-gray-900 rounded-md flex flex-col h-full p-4">
            <h1 class="text-custom-color-tertiary text-2xl font-bold mb-4">Your Chats</h1>

            {#if error}
                <p class="text-red-500 mb-4">{error}</p>
            {/if}

            {#if loading}
                <p class="text-emerald-400">Loading chats...</p>
            {:else if chats.length === 0}
                <p class="text-emerald-400">You don't have any active chats.</p>
            {:else}
                <div class="flex-grow overflow-y-auto">
                    {#each chats as chat (chat.id)}
                        {#if chat && chat.otherParticipantName}
                            <div 
                                class="bg-zinc-800 p-4 rounded-md mb-4 cursor-pointer hover:bg-zinc-700 transition-colors duration-200 relative"
                                on:click={() => navigateToChat(chat.id)}
                                on:keydown={(e) => e.key === 'Enter' && navigateToChat(chat.id)}
                                tabindex="0"
                                role="button"
                            >
                                <h2 class="text-xl font-semibold text-custom-color-tertiary">
                                    Chat with {chat.otherParticipantName}
                                </h2>
                                {#if chat.lastMessage}
                                    <p class="text-emerald-400 text-sm mt-2">
                                        Last message: {chat.lastMessage}
                                    </p>
                                    <p class="text-gray-400 text-xs mt-1">
                                        {chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp.toDate()).toLocaleString() : 'Unknown time'}
                                    </p>
                                {:else}
                                    <p class="text-gray-400 text-sm mt-2">No messages yet</p>
                                {/if}
                                <button
                                    class="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors duration-200"
                                    on:click={(event) => deleteChat(chat, event)}
                                >
                                    Delete
                                </button>
                            </div>
                        {/if}
                    {/each}
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