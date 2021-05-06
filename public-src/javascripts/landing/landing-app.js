import style from '../../stylesheets/style.scss';
import landingStyles from '../../stylesheets/landing.scss';
import {styles} from 'sheodox-ui';
import LandingApp from './LandingApp.svelte';

new LandingApp({
	target: document.getElementById('app-root')
})