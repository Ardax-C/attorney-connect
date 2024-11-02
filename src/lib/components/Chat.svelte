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

    // Move the reactive declaration up
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

    // Handle scroll events
    function handleScroll() {
        isNearBottom = checkIfNearBottom();
        showScrollButton = !isNearBottom;
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
        
        // Add typing users subscription
        typingUsersSubscription = onSnapshot(chatRef, (doc) => {
            if (doc.exists()) {
                chatData = doc.data();
                typingUsers = new Set(chatData?.typingUsers || []);
            }
        });

        const messagesRef = collection(chatRef, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

        unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
            const decryptedMessages = await Promise.all(
                snapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    let decryptedContent;
                    
                    try {
                        // Only decrypt the content if it's not an attachment-only message
                        if (data.content && !data.content.startsWith('📷 ') && !data.content.startsWith('📎 ')) {
                            decryptedContent = await decryptMessage(
                                data.content,
                                chatKey,
                                data.iv
                            );
                        } else {
                            // For attachment messages, use the content as-is
                            decryptedContent = data.content;
                        }
                    } catch (error) {
                        console.error('Decryption error:', error);
                        decryptedContent = '[Encryption Error]';
                    }

                    return {
                        id: doc.id,
                        content: decryptedContent,
                        senderId: data.senderId,
                        timestamp: data.timestamp?.toDate?.() || new Date(),
                        attachments: data.attachments || [],
                        readBy: data.readBy || [],
                        delivered: data.delivered || false  // Include delivered status
                    };
                })
            );

            messages = decryptedMessages;
            loading = false;

            // Mark messages as delivered first, then as read
            await markMessagesAsDelivered();
            await markMessagesAsRead();
        }, (err) => {
            console.error('Error in message subscription:', err);
            error = 'Error loading messages. Please try again later.';
            loading = false;
        });
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
            console.error('Error sending message:', err);
            error = 'Error sending message. Please try again.';
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    onMount(async () => {
        if (!user) {
            const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser) {
                    user = firebaseUser;
                    await loadChat();
                }
                unsubscribe();
            });
        } else {
            await loadChat();
        }
    });

    onDestroy(() => {
        if (unsubscribe) {
            unsubscribe();
        }
        if (typingUsersSubscription) typingUsersSubscription();
        if (typingTimeout) clearTimeout(typingTimeout);
        // Clean up typing status when leaving
        if (user) updateTypingStatus(false);
    });

    // Add this helper function to format timestamps in the template
    function formatTimestamp(timestamp) {
        if (!timestamp) return '';
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
                   date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                   date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    // Handle typing status
    function handleTyping() {
        if (!isTyping) {
            isTyping = true;
            updateTypingStatus(true);
        }
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            updateTypingStatus(false);
        }, 2000);
    }

    // Update typing status in Firestore
    async function updateTypingStatus(typing) {
        const chatRef = doc(db, 'chats', chatId);
        if (typing) {
            await updateDoc(chatRef, {
                typingUsers: arrayUnion(user.uid)
            });
        } else {
            await updateDoc(chatRef, {
                typingUsers: arrayRemove(user.uid)
            });
        }
    }

    // Mark messages as read
    async function markMessagesAsRead() {
        const unreadMessages = messages.filter(
            msg => msg.senderId !== user.uid && !msg.readBy?.includes(user.uid)
        );

        for (const msg of unreadMessages) {
            const messageRef = doc(db, 'chats', chatId, 'messages', msg.id);
            await updateDoc(messageRef, {
                readBy: arrayUnion(user.uid)
            });
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
            console.error('Error uploading file:', error);
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
                <!-- Outer container aligned directly under navbar -->
                <div class="fixed inset-x-0 top-[64px] bottom-0 flex bg-gray-950">
                    <!-- Chat container -->
                    <div class="w-full flex flex-col bg-gray-900">
                        <!-- Header -->
                        <div class="h-16 bg-gray-900 border-b border-gray-800/50 flex items-center justify-between px-4 md:px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <span class="text-blue-400 font-medium">
                                        {otherParticipantName.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <h2 class="text-lg font-medium text-gray-100">{otherParticipantName}</h2>
                                    <span class="text-sm text-gray-400">Active Now</span>
                                </div>
                            </div>
                            
                            <!-- Add VideoChat component here -->
                            <VideoChat 
                                {chatId}
                                userId={user?.uid}
                                {otherParticipantId}
                            />
                        </div>

                        <!-- Messages Container -->
                        <div 
                            bind:this={chatContainer}
                            on:scroll={handleScroll}
                            class="flex-1 overflow-y-auto px-4 md:px-6 py-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            {#each messages as message (message.id)}
                                <div class="flex flex-col mb-4 max-w-[85%] {message.senderId === user.uid ? 'ml-auto' : ''}">
                                    <div class="flex items-end gap-2 {message.senderId === user.uid ? 'flex-row-reverse' : ''}">
                                        <!-- Avatar -->
                                        <div class="w-6 h-6 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center">
                                            <span class="text-xs text-gray-400">
                                                {message.senderId === user.uid ? 'You'.charAt(0) : otherParticipantName.charAt(0)}
                                            </span>
                                        </div>
                                        
                                        <!-- Message Bubble -->
                                        <div class="{message.senderId === user.uid 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-gray-800 text-gray-100'} 
                                            py-2.5 px-4 rounded-2xl rounded-br-sm max-w-full break-words shadow-sm">
                                            {#if message.attachments && message.attachments.length > 0}
                                                {#each message.attachments as attachment}
                                                    {#if attachment.type === 'image'}
                                                        <div class="mb-2">
                                                            <button
                                                                class="block w-full p-0 border-0"
                                                                on:click={() => window.open(attachment.url, '_blank')}
                                                            >
                                                                <img 
                                                                    src={attachment.url} 
                                                                    alt=""
                                                                    class="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                />
                                                            </button>
                                                        </div>
                                                    {:else}
                                                        <a 
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            class="flex items-center gap-2 p-2 rounded bg-gray-700/50 hover:bg-gray-600/50 transition-colors mb-2"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                                                            </svg>
                                                            <div class="flex-1 truncate">
                                                                <div class="text-sm font-medium">{attachment.name}</div>
                                                                <div class="text-xs opacity-75">{formatFileSize(attachment.size)}</div>
                                                            </div>
                                                        </a>
                                                    {/if}
                                                {/each}
                                            {/if}
                                            
                                            {message.content}
                                        </div>
                                    </div>
                                    
                                    <!-- Timestamp -->
                                    <div class="flex items-center text-xs mt-1 text-gray-500 
                                        {message.senderId === user.uid ? 'justify-end mr-8' : 'justify-start ml-8'}">
                                        <span>{formatTimestamp(message.timestamp)}</span>
                                        {#if message.senderId === user.uid}
                                            <span class="ml-2">
                                                {#if message.readBy?.includes(otherParticipantId)}
                                                    <!-- Double check for read -->
                                                    <svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24">
                                                        <path fill="currentColor" d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                                                    </svg>
                                                {:else if message.delivered}
                                                    <!-- Single check for delivered -->
                                                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24">
                                                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                                    </svg>
                                                {:else}
                                                    <!-- Pending delivery -->
                                                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24">
                                                        <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
                                                    </svg>
                                                {/if}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <!-- Typing Indicator -->
                        {#if typingMessage}
                            <div class="px-4 py-2 text-sm text-gray-400 italic">
                                {typingMessage}
                            </div>
                        {/if}

                        <!-- Scroll to Bottom Button -->
                        {#if showScrollButton}
                            <button
                                on:click={scrollToBottom}
                                class="absolute bottom-28 md:bottom-32 right-4 md:right-6 bg-gray-800/90 hover:bg-gray-700/90 text-white p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 flex items-center justify-center group">
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    class="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor">
                                    <path 
                                        stroke-linecap="round" 
                                        stroke-linejoin="round" 
                                        stroke-width="2" 
                                        d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </button>
                        {/if}

                        <!-- Input Container -->
                        <div class="w-full bg-gray-900/50 border-t border-gray-800/50">
                            <div class="p-4">
                                <div class="relative">
                                    <!-- File input (hidden) -->
                                    <input
                                        type="file"
                                        bind:this={fileInput}
                                        on:change={handleFileUpload}
                                        class="hidden"
                                        accept="image/*,.pdf,.doc,.docx,.txt"
                                    />

                                    <!-- Message input -->
                                    <textarea
                                        bind:value={newMessage}
                                        on:input={handleTyping}
                                        on:keydown={(e) => {
                                            if (e.key === 'Enter' && e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Type your message... (Shift + Enter to send)"
                                        class="w-full py-3 px-4 pr-24 rounded-xl border border-gray-700/50 bg-gray-800/50 text-gray-100 placeholder-gray-500 resize-none min-h-[45px] max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                    />

                                    <!-- Attachment and Send buttons -->
                                    <div class="absolute right-2 bottom-2 flex items-center gap-2">
                                        <button
                                            on:click={() => fileInput.click()}
                                            class="p-2 text-gray-400 hover:text-gray-300 transition-colors"
                                            disabled={isUploading}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
                                            </svg>
                                        </button>
                                        <button 
                                            on:click={sendMessage}
                                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
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
        padding-top: 64px;
    }
</style>