/*
	https://en.wikipedia.org/wiki/Operational_transformation
*/
import { prism, htmlToElement, importCSS, consoleHelper } from '../.tools/misc.mjs';
import '../shared.styl';

consoleHelper();

class TransformString {
	value='';
	position=0;

	constructor(value){
		this.value = value
	}

	skip = ({ count }={}) => {
		if(this.position+count > this.value.length) throw new Error('skip past end');
		this.position += count;
	}

	delete = ({ count }={}) => {
		if(this.position+count > this.value.length) throw new Error('delete past end');
		this.value = this.value.slice(0, this.position) + this.value.slice(this.position+count);
	}

	insert = ({ chars }={}) => {
		this.value = this.value.slice(0, this.position) + chars + this.value.slice(this.position);
		this.position += chars.length
	}

	equals = (str) => this.value === str
}

function isValid(stale, latest, otjson) {
	try {
		const ot = JSON.parse(otjson);
		if(!Array.isArray(ot)){
			throw new Error('malformed transform');
		}
		const tstring = new TransformString(stale);
		for(let i=0; i < ot.length; i++){
			const { op, ...args } = ot[i];
			tstring[op](args);
		}
		return [tstring.equals(latest)];
	} catch (e) {
		return [false, e.message]
	}
}

const tests = [
	[
		'Repl.it uses operational transformations to keep everyone in a multiplayer repl in sync.',
		'Repl.it uses operational transformations.',
		'[{"op": "skip", "count": 40}, {"op": "delete", "count": 47}]',
		true
	], [
		'Repl.it uses operational transformations to keep everyone in a multiplayer repl in sync.',
		'Repl.it uses operational transformations.',
		'[{"op": "skip", "count": 45}, {"op": "delete", "count": 47}]',
		false,
		'delete past end'
	], [
		'Repl.it uses operational transformations to keep everyone in a multiplayer repl in sync.',
		'Repl.it uses operational transformations.',
		'[{"op": "skip", "count": 40}, {"op": "delete", "count": 47}, {"op": "skip", "count": 2}]',
		false,
		'skip past end'
	], [
		'Repl.it uses operational transformations to keep everyone in a multiplayer repl in sync.',
		'We use operational transformations to keep everyone in a multiplayer repl in sync.',
		'[{"op": "delete", "count": 7}, {"op": "insert", "chars": "We"}, {"op": "skip", "count": 4}, {"op": "delete", "count": 1}]',
		true
	], [
		'Repl.it uses operational transformations to keep everyone in a multiplayer repl in sync.',
		'Repl.it uses operational transformations to keep everyone in a multiplayer repl in sync.',
		'[]',
		true
	]
];

for(let i=0; i < tests.length; i++){
	const [stale, latest, otjson, expect, reason] = tests[i];
	const [result, fault] = isValid(stale, latest, otjson);
	prism('json', JSON.stringify({
		stale, latest,
		ops:JSON.parse(otjson).map(({op,count,chars})=>`${op}: ${count||chars}`).join(', '),
		expect, reason, result, fault
	},null,2))
}

// operation {
// op: 'skip' | 'delete'
// count: number
// }

// op: 'insert'
// chars: string


function checkKeystrokesToOTs(document, keystrokes, expectedOTs) {
	const actual = JSON.stringify(keystrokesToOts(document, keystrokes));
	const expected = JSON.stringify(expectedOTs);
	const match = actual == expected;

	if (match) {
		console.log(`pass keystrokesToOts("${document}", ${JSON.stringify(keystrokes)})`)
	} else {
		console.log(`fail keystrokesToOts("${document}", ${JSON.stringify(keystrokes)})
	-> expected:
			${expected}
	-> got
			${actual}
`);
	}
}

const OTOpName = {
	'append': ['insert', 'chars'],
	'backspace': ['delete', 'count'],
	'leftArrow': ['skip', 'count', -1],
	'rightArrow': ['skip', 'count'],
};

const clientToOTs = (keyStroke) => {
	const [op, opArgsName, opIt] = OTOpName[Object.keys(keyStroke)[0]];
	const value = keyStroke[Object.keys(keyStroke)[0]];

	return {
		opIt, opArgsName,
		op,
		[opArgsName]: value
	};
}

function keystrokesToOts(document = '', keystrokes = []) {
	const ots = [];
	for (var i = 0, len = keystrokes.length; i < len; i++) {
		// map
		const { opArgsName, opIt, ...ot } = clientToOTs(keystrokes[i]);

		// coalesce
		if (i > 0 && ot.op === ots[ots.length - 1].op) {
			const bump = typeof opIt === 'undefined'
				? ot[opArgsName]
				: ot[opArgsName] * opIt;
			ots[ots.length - 1][opArgsName] += bump;
			continue;
		}

		ots.push(ot);
	}
	return ots;
}


// characters
// backspace
// document
// right arrow
// left arrow

checkKeystrokesToOTs('', [], []);
checkKeystrokesToOTs(
	'',
	[{ 'append': 'a' }],
	[{ 'op': 'insert', 'chars': 'a' }]
);
checkKeystrokesToOTs(
	'',
	[{ 'append': 'a' }, { 'append': 'b' }, { 'append': 'c' }],
	[{ 'op': 'insert', 'chars': 'abc' }]
);

//times up here, guessing at / trying to rememeber the following tests (for fun)
checkKeystrokesToOTs(
	'',
	[{ 'append': 'a' }, { 'append': 'b' }, { 'append': 'c' }, { 'backspace': true }, { 'backspace': true }],
	[{ 'op': 'insert', 'chars': 'abc' }, {"op": "delete", "count": 2}]
);
checkKeystrokesToOTs(
	'hello world',
	[{ rightArrow: 2 }, { rightArrow: 3 }, { 'backspace': true }, { 'backspace': true }],
	[{ 'op': 'skip', 'count': 5 }, {"op": "delete", "count": 2}]
);
checkKeystrokesToOTs(
	'hello world',
	[{ rightArrow: 5 }, { leftArrow: 2 }, { 'backspace': true }, { 'backspace': true }],
	[{ 'op': 'skip', 'count': 3 }, {"op": "delete", "count": 2}]
);