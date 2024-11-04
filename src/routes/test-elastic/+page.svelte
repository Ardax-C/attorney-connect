<script>
    import { onMount } from 'svelte';
    import { initializeElasticSearch } from '$lib/services/elasticSearch';

    let status = 'Checking...';

    onMount(async () => {
        try {
            await initializeElasticSearch();
            status = 'Connected';
        } catch (error) {
            status = `Error: ${error.message}`;
        }
    });
</script>

<div class="p-4">
    <h1>Elasticsearch Connection Test</h1>
    <p>Status: {status}</p>
</div> 