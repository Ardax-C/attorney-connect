<script>
    export let variant = 'primary';
    export let size = 'md';
    export let type = 'button';
</script>

<button
    {type}
    class="font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-color-tertiary
    {variant === 'primary' ? 'bg-custom-color-tertiary text-white hover:bg-custom-color-tertiary/80' : ''}
    {variant === 'secondary' ? 'bg-zinc-700 text-white hover:bg-zinc-600' : ''}
    {variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
    {size === 'sm' ? 'px-2 py-1 text-sm' : ''}
    {size === 'md' ? 'px-4 py-2' : ''}
    {size === 'lg' ? 'px-6 py-3 text-lg' : ''}"
    on:click
>
    <slot></slot>
</button>