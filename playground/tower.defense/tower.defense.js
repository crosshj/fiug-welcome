//show-preview
import { importCSS } from '../../.tools/misc.mjs';
import '../../shared.styl';

import Engine from './td.engine.js';
import Render from './td.render.js';
import State from './td.state.js'

const basicChar = {
	hp: 2000,
	respawn: 200,
	range: 150,
	attack: 30,
	x: 60,
	move: 10
};

const state = new State({
	field: {
		height: 200,
		width: 1000
	},
	towers: [{
		type: 'attacker',
		dims: [30, 90],
		x: 25,
		color: '#67b',
		hp: 500,
		deployed: [ basicChar ]
	}, {
		type: 'defender',
		dims: [30, 90],
		x: 25,
		color: '#b76',
		hp: 500,
		// attack: <=68(blue), 69-71.4(tie), >=71.5 (red)
		deployed: [{
			...basicChar,
			hp:100, range: 400, attack: 68
		}]
	}],
	tick: 0,
});

const moveDeployed = ({ tick, towers }) => {
	const move = char => {
		if(char.target) return;
		char.x += char.move;
	};
	const deployed = towers.reduce(
		(all, one) => ([...all, ...one.deployed]
	), []);
	deployed.forEach(move);
};

const targetOpponents = (state) => {
	const { towers } = state.global();
	towers.forEach((tower, i) => {
		const isAttack = tower.type === "attacker";
		const opponent = towers[isAttack ? 1 : 0];
		const withinRange = (char, opp) => isAttack
			? (char.x + char.range) >= opp.x
			: (char.x - char.range) <= opp.x;
		tower.deployed.forEach((char, j) => {
			if(char.target) return;
			const nearby = [opponent, ...opponent.deployed]
				.filter((opp) => withinRange(char, opp));
			if(!nearby.length) return;
			state.towers[i].deployed[j].target = isAttack
				? nearby.sort((a, b) => b -a)[0].id
				: nearby.sort((a, b) => a - b)[0].id;
		})
	});
};

const attackOpponents = ({ towers }) => {
	const attacking = [...towers[0].deployed, ...towers[1].deployed]
		.filter(x => x.target);
	attacking.forEach(attacker => {
		const target = state.getById(attacker.target);
		target.hp -= attacker.attack;
		if(target.hp < 0){
			target.status = 'dead';
			attacker.target = undefined;
		}
	});
	towers.forEach(tower => {
		if(tower.hp <= 0) tower.status = 'dead';
		tower.deployed = tower.deployed
			.filter(x => x.status !== 'dead')
	});
};

// towers spawn characters (use spawn timer)
// characters move or attack
const gameLoop = () => {
	try {
		targetOpponents(state);
		attackOpponents(state);
		moveDeployed(state);
		const gameOver = !(state.towers[0].hp > 0 &&
			state.towers[1].hp > 0);
		const continueGame = !state.gameOver
		state.gameOver = gameOver;
		state.tick++;
		return continueGame;
	} catch(e) {
		console.error(e);
		return false;
	} 
};

const highPriority = () => {}; //animation events?

const engine = new Engine({
	throttle: 150,
	state,
	highPriority,
	gameLoop,
	tryRender: new Render({ state }),
});

setTimeout(engine.start, 50);