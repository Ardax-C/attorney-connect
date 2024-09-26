<script>
    import { page } from '$app/stores';
    import Chat from '$lib/components/Chat.svelte';

    $: chatId = $page.params.id;
</script>

<Chat {chatId} />