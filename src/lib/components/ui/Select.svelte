<script>
    export let value;
    export let options = [];
</script>

<select
    bind:value
    class="bg-zinc-700 text-emerald-400 p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-custom-color-tertiary"
    on:change
>
    {#each options as option}
        <option value={option.value}>{option.label}</option>
    {/each}
</select>