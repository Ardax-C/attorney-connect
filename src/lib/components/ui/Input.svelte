<script>
    export let placeholder = "";
    export let value = "";
    export let type = "text";

    const handleInput = e => {
        value = type.match(/^(number|range)$/)
            ? +e.target.value
            : e.target.value;
    }
</script>




<input
    class="w-full bg-zinc-700 text-emerald-400 p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-custom-color-tertiary"
    {type} {value} {placeholder} on:input={handleInput}
/>
