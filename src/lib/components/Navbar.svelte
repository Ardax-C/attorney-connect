<script>
    import '../../styles/custom-filters.css';
    import brandLogo from '../images/logo-small.png';
    import { onMount } from 'svelte';

    let currentPath = '';

    onMount(() => {
        if (typeof window !== 'undefined') {
            currentPath = window.location.pathname;

            window.addEventListener('popstate', () => {
                currentPath = window.location.pathname;
            });
        }
    });
</script>

<div class="nav w-full flex justify-end">
    <ul>
        <li>
            <a href="{currentPath === '/' ? '/login' : '/'}">
                <img src="{brandLogo}" alt="" class="filter-brand-logo-1 mr-10 mt-5">
            </a>
        </li>
    </ul>
</div>