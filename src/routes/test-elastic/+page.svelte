<script>
    import { onMount } from 'svelte';
    import { ElasticSearchService } from '$lib/services/elasticSearch';

    let status = 'Checking...';
    let envVars = {
        hasCloudId: false,
        hasApiKey: false
    };

    onMount(async () => {
        envVars = {
            hasCloudId: !!import.meta.env.VITE_ELASTIC_CLOUD_ID,
            hasApiKey: !!import.meta.env.VITE_ELASTIC_API_KEY
        };

        const es = new ElasticSearchService();
        if (es.client) {
            const connected = await es.testConnection();
            status = connected ? 'Connected' : 'Connection Failed';
        } else {
            status = 'Client Not Initialized';
        }
    });
</script>

<div class="p-4">
    <h1>Elasticsearch Status</h1>
    <pre>{JSON.stringify({ status, envVars }, null, 2)}</pre>
</div> 