<script>
    import { onMount } from 'svelte';
    import { initializeElasticSearch } from '$lib/services/elasticSearch';

    let status = 'Checking...';

    onMount(async () => {
        try {
            await initializeElasticSearch();
            status = 'Connected successfully';
        } catch (error) {
            status = 'Connection failed';
            console.error('ElasticSearch connection error:', error);
        }
    });
</script>

<div class="p-4">
    <h1>Elasticsearch Connection Test</h1>
    <p>Status: {status}</p>
</div> 