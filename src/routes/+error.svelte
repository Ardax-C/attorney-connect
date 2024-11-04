<script>
	import { page } from '$app/stores';
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		<h1 class="text-4xl font-bold mb-4">
			{$page.status}: {$page.error?.message || 'Page not found'}
		</h1>
		<a href="/" class="text-blue-500 hover:underline">Go back home</a>
	</div>
</div>
