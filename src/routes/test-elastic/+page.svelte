<script>
    import { onMount } from 'svelte';
    import { elasticSearchService } from '$lib/services/elasticSearch';

    let status = 'Checking...';

    onMount(async () => {
        try {
            const isConnected = await elasticSearchService.initialize();
            status = isConnected ? 'Connected' : 'Failed to connect';
        } catch (error) {
            status = `Error: ${error.message}`;
        }
    });
</script>

<div class="p-4">
    <h1>Elasticsearch Connection Test</h1>
    <p>Status: {status}</p>
</div> 