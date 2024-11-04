<script>
    import { onMount, afterUpdate, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import { db, auth } from '$lib/firebase';
    import { doc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
    import { requireAuth } from '$lib/auth.js';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/dark_lattice.png';
    import { generateEncryptionKey, exportKey, importKey, encryptMessage, decryptMessage } from '$lib/services/encryptionService.js';
    import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
    import VideoChat from './VideoChat.svelte';
    import CourtBriefs from './CourtBriefs.svelte';
    import { addChatSubscription, removeChatSubscription } from '$lib/stores/auth';
    import GifPicker from './GifPicker.svelte';
    import { fade } from 'svelte/transition';

    export let chatId;

    let messages = [];
    let newMessage = '';
    let chatContainer;
    let user = null;
    let loading = true;
    let error = null;
    let chatData = null;
    let otherParticipantName = "Attorney";
    let otherParticipantId = null;
    let unsubscribe;

    let chatInitialized = false;
    let chatKey = null;

    let showScrollButton = false;
    let isNearBottom = true;

    let isTyping = false;
    let typingTimeout;
    let typingUsers = new Set();

    let fileInput;
    let isUploading = false;
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit

    let typingUsersSubscription;
    let typingMessage = '';

    let videoChatComponent;

    let showBriefs = false;

    let isRecipientOnline = false;
    let isRecipientIdle = false;

    let showGifPicker = false;

    $: typingMessage = Array.from(typingUsers)
        .filter(id => id !== user?.uid)
        .length > 0 ? `${otherParticipantName} is typing...` : '';

    // Function to check if scrolled near bottom
    function checkIfNearBottom() {
        if (!chatContainer) return true;
        const threshold = 100; // pixels from bottom
        const position = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
        return position < threshold;
    }

    // Scroll to bottom function
    function scrollToBottom() {
        chatContainer?.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
        showScrollButton = false;
    }

    // Watch for new messages
    $: if (messages && chatContainer) {
        if (isNearBottom) {
            // If we're near the bottom, scroll to bottom
            setTimeout(scrollToBottom, 0);
        } else {
            // If we're scrolled up, show the scroll button
            showScrollButton = true;
        }
    }

    async function initializeChat() {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (!chatDoc.exists()) {
            error = 'Chat not found';
            return false;
        }

        const chatData = chatDoc.data();
        
        // Initialize encryption key
        if (!chatData.encryptionKey) {
            chatKey = await generateEncryptionKey();
            const exportedKey = await exportKey(chatKey);
            await updateDoc(chatRef, {
                encryptionKey: exportedKey
            });
        } else {
            chatKey = await importKey(chatData.encryptionKey);
        }

        // Load other participant details
        otherParticipantId = chatData.participants.find(id => id !== user.uid);
        if (otherParticipantId) {
            const attorneyDoc = await getDoc(doc(db, 'attorneyProfiles', otherParticipantId));
            if (attorneyDoc.exists()) {
                const attorneyData = attorneyDoc.data();
                otherParticipantName = `${attorneyData.firstName} ${attorneyData.lastName}`;
                
                // Set up online status subscription
                const unsubscribeStatus = await subscribeToOnlineStatus();
                // Add unsubscribeStatus to cleanup function
                const originalUnsubscribe = unsubscribe;
                unsubscribe = () => {
                    if (originalUnsubscribe) originalUnsubscribe();
                    if (unsubscribeStatus) unsubscribeStatus();
                };
            }
        }

        chatInitialized = true;
        return true;
    }

    async function loadChat() {
        if (!chatInitialized) {
            const success = await initializeChat();
            if (!success) return;
        }

        const chatRef = doc(db, 'chats', chatId);
        
        // Create separate subscription for chat metadata
        const chatMetadataUnsubscribe = onSnapshot(chatRef, (doc) => {
            if (doc.exists()) {
                chatData = doc.data();
                // Only update typing users if it exists in the data
                if ('typingUsers' in chatData) {
                    typingUsers = new Set(chatData.typingUsers || []);
                }
            }
        }, (error) => {
            console.error('Error in chat metadata subscription:', error);
        });

        // Create separate subscription for messages
        const messagesRef = collection(chatRef, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

        const messagesUnsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
            const decryptedMessages = await Promise.all(
                snapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    let decryptedContent;
                    
                    try {
                        if (data.content && !data.content.startsWith('📷 ') && !data.content.startsWith('📎 ')) {
                            decryptedContent = await decryptMessage(
                                data.content,
                                chatKey,
                                data.iv
                            );
                        } else {
                            decryptedContent = data.content;
                        }
                    } catch (error) {
                        decryptedContent = '[Encryption Error]';
                    }

                    return {
                        id: doc.id,
                        content: decryptedContent,
                        senderId: data.senderId,
                        timestamp: data.timestamp?.toDate?.() || new Date(),
                        attachments: data.attachments || [],
                        readBy: data.readBy || [],
                        delivered: data.delivered || false
                    };
                })
            );

            messages = decryptedMessages;
            loading = false;

            await markMessagesAsDelivered();
            await markMessagesAsRead();
        }, (err) => {
            error = 'Error loading messages. Please try again later.';
            loading = false;
        });

        // Combine unsubscribe functions
        const combinedUnsubscribe = () => {
            chatMetadataUnsubscribe();
            messagesUnsubscribe();
        };

        // Store the unsubscribe function
        unsubscribe = combinedUnsubscribe;
        addChatSubscription(chatId, combinedUnsubscribe);
    }

    async function sendMessage() {
        if (newMessage.trim() === '') return;

        try {
            if (!chatInitialized) {
                const success = await initializeChat();
                if (!success) return;
            }

            const chatRef = doc(db, 'chats', chatId);
            const messagesRef = collection(chatRef, 'messages');
            const messageContent = newMessage.trim();
            
            // Clear input immediately
            newMessage = '';

            // Encrypt message
            const { encrypted, iv } = await encryptMessage(messageContent, chatKey);
            const messageTimestamp = serverTimestamp();

            // Store encrypted message
            await addDoc(messagesRef, {
                content: encrypted,
                iv: iv,
                senderId: user.uid,
                timestamp: messageTimestamp,
                readBy: [],
                delivered: false,  // Add delivered field
                attachments: []
            });

            // Update chat metadata
            await updateDoc(chatRef, {
                lastMessageTimestamp: messageTimestamp,
                [`unreadCount.${otherParticipantId}`]: increment(1)
            });

        } catch (err) {
            error = 'Error sending message. Please try again.';
        }
    }

    onMount(async () => {
        try {
            user = await requireAuth();
            await loadChat();
        } catch (error) {
            // ... existing error handling ...
        }
    });

    onDestroy(() => {
        if (unsubscribe) {
            unsubscribe();
            removeChatSubscription(chatId);
        }
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        // Only attempt to update typing status if still authenticated
        if (user && auth.currentUser) {
            updateTypingStatus(false).catch(() => {
                // Silently ignore any errors during cleanup
            });
        }
    });

    // Add this function to format message timestamps
    function formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) {
            return 'Just now';
        } else if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    // Update the existing formatTimestamp function to use the new formatMessageTime
    function formatTimestamp(timestamp) {
        return formatMessageTime(timestamp);
    }

    // Handle typing status
    function handleTyping() {
        if (!isTyping) {
            isTyping = true;
            updateTypingStatus(true);
        }
        
        // Reset the timeout
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            updateTypingStatus(false);
        }, 2000);
    }

    // Update typing status in Firestore
    async function updateTypingStatus(typing) {
        if (!chatId || !user?.uid || !auth.currentUser) return; // Enhanced guard clause
        
        const chatRef = doc(db, 'chats', chatId);
        try {
            if (typing) {
                await updateDoc(chatRef, {
                    typingUsers: arrayUnion(user.uid)
                });
            } else {
                await updateDoc(chatRef, {
                    typingUsers: arrayRemove(user.uid)
                });
            }
        } catch (error) {
            // Only log error if it's not a permissions error during logout
            if (!error.message.includes('Missing or insufficient permissions')) {
                console.error('Error updating typing status:', error);
            }
        }
    }

    // Mark messages as read
    async function markMessagesAsRead() {
        if (!user?.uid) return; // Add guard clause
        
        const unreadMessages = messages.filter(
            msg => msg.senderId !== user.uid && !msg.readBy?.includes(user.uid)
        );

        for (const msg of unreadMessages) {
            try {
                const messageRef = doc(db, 'chats', chatId, 'messages', msg.id);
                await updateDoc(messageRef, {
                    readBy: arrayUnion(user.uid)
                });
                
                // Also update the unread count in the chat document
                const chatRef = doc(db, 'chats', chatId);
                await updateDoc(chatRef, {
                    [`unreadCount.${user.uid}`]: 0
                });
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        }
    }

    // Add this function to mark messages as delivered
    async function markMessagesAsDelivered() {
        const undeliveredMessages = messages.filter(
            msg => msg.senderId !== user.uid && !msg.delivered
        );

        for (const msg of undeliveredMessages) {
            const messageRef = doc(db, 'chats', chatId, 'messages', msg.id);
            await updateDoc(messageRef, {
                delivered: true
            });
        }
    }

    // Handle file selection
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > maxFileSize) {
            alert('File size must be less than 10MB');
            return;
        }

        try {
            isUploading = true;
            const storage = getStorage();
            const fileRef = storageRef(storage, `chat-attachments/${chatId}/${Date.now()}_${file.name}`);
            
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            // Send message with attachment - no encryption needed for this message
            const messageTimestamp = serverTimestamp();
            const attachment = {
                type: file.type.startsWith('image/') ? 'image' : 'file',
                url: downloadUrl,
                name: file.name,
                size: file.size
            };

            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                // Don't encrypt this message since it's just a file indicator
                content: file.type.startsWith('image/') ? '📷 Image' : `📎 ${file.name}`,
                senderId: user.uid,
                timestamp: messageTimestamp,
                readBy: [],
                attachments: [attachment],
                // No IV needed since we're not encrypting
            });

        } catch (error) {
            alert('Failed to upload file. Please try again.');
        } finally {
            isUploading = false;
            fileInput.value = ''; // Reset file input
        }
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Add this function to handle voice calls
    function startCall() {
        if (videoChatComponent) {
            videoChatComponent.startCall();
        }
    }

    function toggleBriefs() {
        showBriefs = !showBriefs;
    }

    async function subscribeToOnlineStatus() {
        if (!otherParticipantId) return;
        
        
        const userStatusRef = doc(db, 'userStatus', otherParticipantId);
        return onSnapshot(userStatusRef, (snapshot) => {
            const data = snapshot.data();
            isRecipientOnline = data?.online || false;
            isRecipientIdle = data?.idle || false;
        });
    }

    // Update the handleGifSelect function
    async function handleGifSelect(gif) {
        try {
            if (!chatInitialized) {
                const success = await initializeChat();
                if (!success) return;
            }

            const chatRef = doc(db, 'chats', chatId);
            const messagesRef = collection(chatRef, 'messages');
            const messageTimestamp = serverTimestamp();
            
            // Create a message with attachments instead of using messageType
            const messageData = {
                content: '📱 GIF', // Plain text indicator
                senderId: user.uid,
                timestamp: messageTimestamp,
                readBy: [],
                delivered: false,
                attachments: [{
                    type: 'gif',
                    url: gif.url,
                    preview: gif.preview,
                    width: gif.width,
                    height: gif.height
                }]
            };

            console.log('Sending GIF message:', messageData);
            await addDoc(messagesRef, messageData);

            // Update chat metadata
            await updateDoc(chatRef, {
                lastMessageTimestamp: messageTimestamp,
                lastMessage: '📱 GIF',
                [`unreadCount.${otherParticipantId}`]: increment(1)
            });

        } catch (error) {
            console.error('Error sending GIF:', error);
        }
    }

    const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "near bottom"

    
    function handleScroll() {
        if (!chatContainer) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainer;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        isNearBottom = distanceFromBottom <= SCROLL_THRESHOLD;
        showScrollButton = !isNearBottom;
    }

    
    function scrollToLatest() {
        if (!chatContainer) return;
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Modify your existing afterUpdate
    afterUpdate(() => {
        if (!chatContainer) return;
        
        if (isNearBottom) {
            scrollToLatest();
        } else if (messages?.length) {
            showScrollButton = true;
        }
    });

    // Add onMount to initialize scroll position
    onMount(() => {
        if (chatContainer) {
            scrollToLatest();
        }
    });
</script>

<main class="bg-no-repeat bg-center bg-cover fixed inset-0 flex flex-col" style="background-image: url({backgroundImage})">
    <div class="flex-grow container mx-auto p-2 md:p-4 flex flex-col overflow-hidden">
        <div class="bg-gray-900/95 backdrop-blur-sm rounded-xl flex flex-col h-full shadow-2xl">
            {#if loading}
                <!-- Loading state -->
            {:else}
                <VideoChat
                    bind:this={videoChatComponent}
                    {chatId}
                    userId={user?.uid}
                    {otherParticipantId}
                    {showBriefs}
                    {toggleBriefs}
                />
                <div class="fixed inset-x-0 top-[64px] bottom-0 flex bg-gray-950/50 backdrop-blur-sm">
                    <!-- Chat Container - Updated with dynamic width -->
                    <div class="flex-1 flex flex-col bg-gray-900/90 {showBriefs ? 'w-[50%]' : 'w-full'} transition-all duration-300">
                        <!-- Chat Header - Updated with briefs toggle -->
                        <div class="h-16 bg-gray-900/95 border-b border-gray-800/50 flex items-center justify-between px-3 md:px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-medium">
                                    {otherParticipantName[0]}
                                </div>
                                <div>
                                    <h2 class="text-white font-medium">{otherParticipantName}</h2>
                                    <div class="flex items-center gap-1.5">
                                        <div class="w-2 h-2 rounded-full {
                                            isRecipientOnline 
                                                ? isRecipientIdle 
                                                    ? 'bg-yellow-500' 
                                                    : 'bg-green-500 animate-pulse' 
                                                : 'bg-gray-500'
                                        }" />
                                        <p class="text-xs text-gray-400">
                                            {#if isRecipientOnline}
                                                {#if isRecipientIdle}
                                                    Idle
                                                {:else}
                                                    Active Now
                                                {/if}
                                            {:else}
                                                Offline
                                            {/if}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Call and Briefs Buttons -->
                            <div class="flex items-center gap-4">
                                <!-- Briefs Toggle Button -->
                                <button 
                                    class="p-2.5 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                                    on:click={toggleBriefs}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {showBriefs ? 'text-blue-400' : 'text-gray-400'}" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                                    </svg>
                                </button>
                                <!-- Existing Call Button -->
                                <button 
                                    class="p-2.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors {!otherParticipantId ? 'opacity-50 cursor-not-allowed' : ''}"
                                    on:click={startCall}
                                    disabled={!otherParticipantId}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Existing Messages Container -->
                        <div 
                            bind:this={chatContainer}
                            on:scroll={handleScroll}
                            class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative"
                        >
                            {#each messages as message}
                                <div class="flex flex-col mb-4 {message.senderId === user.uid ? 'items-end' : 'items-start'} {message.senderId === user.uid ? 'ml-auto' : 'mr-auto'} max-w-[85%] md:max-w-[75%]">
                                    <!-- Message Content -->
                                    <div class="{message.senderId === user.uid 
                                        ? 'bg-blue-500 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm' 
                                        : 'bg-gray-800 text-gray-100 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm'} 
                                        py-2.5 px-4 break-words shadow-sm"
                                    >
                                        {#if message.attachments?.length > 0 && message.attachments[0].type === 'gif'}
                                            <img
                                                src={message.attachments[0].url}
                                                alt="GIF"
                                                loading="lazy"
                                                class="rounded-lg w-full h-auto max-w-[300px]"
                                            />
                                        {:else if message.attachments?.length > 0}
                                            {#each message.attachments as attachment}
                                                <div class="mb-2">
                                                    {#if attachment.type === 'file'}
                                                        <div class="text-sm">
                                                            {attachment.name} ({formatFileSize(attachment.size)})
                                                        </div>
                                                    {:else}
                                                        <img 
                                                            src={attachment.url} 
                                                            alt=""
                                                            class="rounded-lg max-w-[300px] w-full h-auto"
                                                        />
                                                    {/if}
                                                </div>
                                            {/each}
                                        {:else if message.iv}
                                            {#await decryptMessage(message.content, message.iv, chatKey)}
                                                <div class="animate-pulse">Decrypting...</div>
                                            {:then decryptedContent}
                                                {decryptedContent}
                                            {:catch error}
                                                <div class="text-red-400">Error decrypting message</div>
                                            {/await}
                                        {:else}
                                            {message.content}
                                        {/if}
                                    </div>

                                    <!-- Message Meta -->
                                    <div class="flex items-center text-xs mt-1 text-gray-500 gap-2 {message.senderId === user.uid ? 'justify-end' : 'justify-start'}">
                                        <span>{formatMessageTime(message.timestamp)}</span>
                                        {#if message.senderId === user.uid}
                                            <span>
                                                {#if message.readBy?.includes(otherParticipantId)}
                                                    <svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24">
                                                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                                    </svg>
                                                {:else if message.delivered}
                                                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24">
                                                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                                    </svg>
                                                {:else}
                                                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24">
                                                        <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
                                                    </svg>
                                                {/if}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/each}

                            <!-- Scroll button inside the messages container -->
                            {#if showScrollButton}
                                <button
                                    on:click={scrollToLatest}
                                    class="sticky right-8 bottom-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-10 h-10 shadow-lg transition-all duration-200 flex items-center justify-center mb-4"
                                    transition:fade
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            {/if}
                        </div>

                        <!-- Existing Message Input -->
                        <div class="w-full bg-gray-900/95 border-t border-gray-800/50">
                            {#if typingMessage}
                                <div class="text-sm text-gray-400 italic px-4 py-2 border-b border-gray-800/50">
                                    {typingMessage}
                                </div>
                            {/if}
                            <div class="p-3 md:p-4">
                                <div class="flex flex-col gap-3">
                                    <!-- Message Input -->
                                    <textarea
                                        bind:value={newMessage}
                                        on:input={handleTyping}
                                        on:keydown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Type your message... (Enter to send, Shift + Enter for new line)"
                                        class="w-full py-2.5 px-4 rounded-xl border border-gray-700/50 bg-gray-800/50 text-gray-100 placeholder-gray-500 resize-none min-h-[45px] max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm"
                                    />

                                    <!-- Action Buttons -->
                                    <div class="flex items-center gap-3">
                                        <div class="flex items-center gap-2">
                                            <!-- GIF Button -->
                                            <button
                                                on:click={() => showGifPicker = true}
                                                class="p-2 text-gray-400 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800"
                                                title="Send GIF"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                                                    <text x="3" y="17" font-size="8" fill="currentColor">GIF</text>
                                                </svg>
                                            </button>

                                            <!-- File Upload Button -->
                                            <input 
                                                bind:this={fileInput}
                                                type="file"
                                                on:change={handleFileUpload}
                                                class="hidden"
                                                accept="image/*,.pdf,.doc,.docx,.txt"
                                            />
                                            <button
                                                on:click={() => fileInput.click()}
                                                class="p-2 text-gray-400 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800"
                                                disabled={isUploading}
                                                title="Upload File"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>

                                        <!-- Send Button -->
                                        <button 
                                            on:click={sendMessage}
                                            class="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                            disabled={isUploading}
                                        >
                                            {#if isUploading}
                                                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            {:else}
                                                Send
                                            {/if}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Court Briefs Panel -->
                    {#if showBriefs}
                        <div class="w-[50%] border-l border-gray-800/50 transition-all duration-300 overflow-y-auto z-[60]">
                            <div class="h-full pb-16 pointer-events-auto">
                                <CourtBriefs />
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</main>

<!-- Add GIF Picker Modal -->
{#if showGifPicker}
    <GifPicker
        onSelect={handleGifSelect}
        onClose={() => showGifPicker = false}
    />
{/if}

<style>
    :global(body) {
        overflow: hidden;
    }

    main {
        padding-top: 64px;
    }

    /* Add to your existing styles */
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(156, 163, 175, 0.5);
        border-radius: 3px;
    }
</style>