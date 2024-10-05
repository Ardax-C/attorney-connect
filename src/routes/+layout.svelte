<script>
    import '../app.css'
    import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
    import { inject } from '@vercel/analytics'
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
    import { browser } from '$app/environment';
    import { notificationCount } from '$lib/stores/notificationStore';
    import Navbar from '$lib/components/Navbar.svelte';
    
    let user = null;
    let userRole = null;

    function setupNotificationListener(userId) {
        const chatsQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', userId)
        );

        const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
            let totalUnreadCount = 0;
            snapshot.docs.forEach((doc) => {
                const chatData = doc.data();
                if (chatData.unreadCount && 
                    chatData.unreadCount[userId] && 
                    (!chatData.activeUsers || !chatData.activeUsers[userId])) {
                    totalUnreadCount += chatData.unreadCount[userId];
                }
            });
            notificationCount.set(totalUnreadCount);
        });

        return unsubscribe;
    }

    onMount(() => {
        if (browser) {
            // Google Tag Manager
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5FS9LFDZ');
        }

        let notificationUnsubscribe;

        const authUnsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            user = firebaseUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userRole = userData.role;
                   
                    // Redirect based on user status
                    if (userData.status === 'pending' && $page.url.pathname !== '/registration-pending') {
                        goto('/registration-pending');
                    } else if (userData.status === 'denied') {
                        auth.signOut();
                        goto('/login');
                    }

                    // Setup notification listener
                    notificationUnsubscribe = setupNotificationListener(user.uid);
                }
            } else {
                userRole = null;
                notificationCount.set(0);
                if (notificationUnsubscribe) {
                    notificationUnsubscribe();
                }
            }
        });

        return () => {
            authUnsubscribe();
            if (notificationUnsubscribe) {
                notificationUnsubscribe();
            }
        };
    })

    $: if (browser && window.dataLayer) {
        window.dataLayer.push({
            event: 'pageView',
            page: {
                url: $page.url.pathname,
                title: document.title
            }
        });
    }

    injectSpeedInsights();
    inject();
</script>

<Navbar />
<slot></slot>