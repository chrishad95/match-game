
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();


// all environments
app.set('port', process.env.PORT || 3030);
//app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var io = require('socket.io').listen(app.listen(app.get('port')));
var g = new Game(0);
var timeout;
var sockets = {};

io.sockets.on('connection', function (socket) {
	sockets[socket.id] = socket;

	console.log("socket connected: " + socket.id);
	g.clients[socket.id] = {name: "player" + g.num_clients++};
	if (g.num_players < g.max_players) {
		g.num_players++;
		// set up a new player
		g.players[socket.id] = new Player(socket.id);
		g.players[socket.id].name = g.clients[socket.id].name;
		g.players[socket.id].disconnected = false;

		if (g.num_players >= g.min_players && g.game_started == false)
		{
			if(timeout) {
				console.log(socket.id + ": Timeout is already set, game will start soon.");
				socket.emit("alert", {message: "Game will start soon."});
			} else {
				console.log("Game will start in 15 seconds.");
				socket.emit("alert", {message: "Game will start in 15 seconds."});

				timeout = setInterval(startGame, 3000);
			}
		}
	}

	socket.on('disconnect', onDisconnect );
	socket.on('update', onUpdate );
	socket.on('Roll', onRoll );
	socket.on('get dress', onGetDress );
	socket.on('get shoes', onGetShoes );
	socket.on('exchange shoes', onExchangeShoes );
	socket.on('exchange dress', onExchangeDress );

});

function startGame() {
	console.log("Starting the game.");
	clearInterval(timeout);
	setupGame();
	timeout = null;
}

function onUpdate() {
	//console.log("Sending " + g.clients[this.id].name + " a game update.");
	//this.emit('update', {game_state: g, my_id: this.id});
	//console.log("Sent an update to " + g.clients[this.id].name);
}

function Game(id){
	this.id = id;
	this.players = {};
	this.clients = {};

	this.shoes   = [0,1,2,3,4,5,6,7,8,9,10,11];
	this.dresses = [0,1,2,3,4,5,6,7,8,9,10,11];

	this.num_clients = 0;
	this.num_players = 0;
	this.max_players = 3;
	this.min_players = 2;
	this.player_order = [];
	this.game_started = false;
	this.status = 'Waiting for players';
}

function Player(id){
	this.id = id;
	this.dresses = [];
	this.shoes = [];
	this.matches = [];

	this.disconnected = true;
}

// this function is called one time to set up the tournament
function setupGame(){
	g.status = "Initializing game";
	g.player_order = [];

	for (p in g.players){
		g.player_order.push(p);
	}

	//shuffle the player order
	fisherYates(g.player_order);

	//shuffle the shoes
	fisherYates(g.shoes);

	//shuffle the dresses
	fisherYates(g.dresses);

	for (p in g.player_order) {
		// the player object will store the order
		g.players[g.player_order[p]].order = p
	}

	g.round = 0;

	g.game_started = true;
	
	// tell the game whose turn it is
	g.player_turn = g.player_order[0];
	g.players[g.player_turn].action = "Roll";
	sendUpdates();
}


function fisherYates ( myArray ) {
	var i = myArray.length;
	if ( i == 0 ) return false;
	while ( --i ) {
		var j = Math.floor( Math.random() * ( i + 1 ) );
		var tempi = myArray[i];
		var tempj = myArray[j];
		myArray[i] = tempj;
		myArray[j] = tempi;
	}
}

function onDisconnect () {
	g.players[this.id].disconnected = true;
	console.log(g.players[this.id].name + " disconnected.");
}

function onRoll() {
	console.log(g.players[this.id].name + " is trying to roll.");
	if (this.id == g.player_turn && g.players[this.id].action  == "Roll") {
		console.log("It is " + g.players[this.id].name + "'s turn to roll.");

		var actions = ['exchange shoes', 'exchange dress'];
		if (g.dresses.length > 0) {
			actions.push('get dress');
		}
		if (g.shoes.length > 0) {
			actions.push('get shoes');
		}

		fisherYates(actions);
		g.players[this.id].action = actions.shift(); 
		sendUpdates();
	}
}

function nextPlayer() {
	console.log("Current player: " + g.player_turn);

	g.players[g.player_turn].action = "";

	player_idx = g.player_order.indexOf(g.player_turn) + 1;
	player_idx = player_idx % g.player_order.length;

	g.player_turn = g.player_order[player_idx];

	g.players[g.player_turn].action = "Roll";

	console.log("Next player: " + g.player_turn);
}

function onExchangeDress(data) {
	console.log(g.players[this.id].name + " is trying to exchange a dress.");

	if (this.id == g.player_turn && g.players[this.id].action  == "exchange dress") {
		if (g.players[data.exchange_player]) {
			if (g.players[data.exchange_player].dresses.length > 0) {
			} else {
				// player has no dresses
				if (g.players[this.id].dresses.indexOf(data.dress_id) >= 0) {
					// this player has send a valid dress that they own
					g.players[data.exchange_player].dresses.push( data.dress_id);
					g.players[this.id].dresses.splice( g.players[this.id].dresses.indexOf(data.dress_id),1);
					nextPlayer();
				}
			}

		}

	}

}
function onExchangeShoes(data) {
	console.log(g.players[this.id].name + " is trying to exchange shoes.");
	if (this.id == g.player_turn && g.players[this.id].action  == "exchange shoes") {
	}
	
}

function onGetDress() {
	console.log(g.players[this.id].name + " is trying to get a dress.");
	if (this.id == g.player_turn && g.players[this.id].action  == "get dress") {
		new_dress = g.dresses.shift();

		if (g.players[this.id].shoes.indexOf(new_dress) >= 0) {
			g.players[this.id].matches.push(new_dress);
			g.players[this.id].shoes.splice(g.players[this.id].shoes.indexOf(new_dress),1);
		} else {
			g.players[this.id].dresses.push(new_dress);
		}
		g.players[this.id].action = "";

		if (g.players[this.id].matches.length >= 3) {
			g.winner = g.player_turn;
			g.status = "Game Over";
			g.player_turn = "";
		} else {
			nextPlayer();
		}
		sendUpdates();
	}
	

}
function onGetShoes() {
	console.log(g.players[this.id].name + " is trying to get a shoe.");
	if (this.id == g.player_turn && g.players[this.id].action  == "get shoes") {
		new_shoe = g.shoes.shift();

		if (g.players[this.id].dresses.indexOf(new_shoe) >= 0) {
			g.players[this.id].matches.push(new_shoe);
			g.players[this.id].dresses.splice(g.players[this.id].dresses.indexOf(new_shoe),1);
		} else {
			g.players[this.id].shoes.push(new_shoe);
		}
		g.players[this.id].action = "";

		if (g.players[this.id].matches.length >= 3) {
			g.winner = g.player_turn;
			g.status = "Game Over";
			g.player_turn = "";
		} else {
			nextPlayer();
		}
		sendUpdates();
	}
}

function isGameOver() {

	for (p in g.players) {
		if (g.players[p].matches.length >= 3) {
			return true;
		}
	}
	return false;
}

function sendUpdates() {
	for (p in g.players) {
		if (! g.players[p].disconnected) {
			sockets[p].emit('update', {game_state: g, my_id: p});
		}
	}
}



/*

Game steps

players join game then
as soon as the min number of players join,
the game will start after a period of time (timeout)
once the game is started the first player takes his turn
a player turn consists of
roll to see what action he can take 
 - draw a dress
 - get shoes
 - exchange shoes with another player
 - exchange a dress with another player

if a player is to draw a dress or shoes, then pull the next pair of shoes or the next dress 
from the array of dresses/shoes

if a player is to exchange shoes or a dress, then the player must pick the item to exchange and
	the player to exchange with

once the player has added an item from draw or from exchange to the appropriate player array (shoes, dresses)
, check for matches.
move new matches to the player matches array
if the player did an exchange, the exchanging player also should check for matches

finally, check to see if any player has 3 matches, if so then the game is over and any player who has 3 matches
is the/a winner.

after a time, offer a rematch

if the game is restarted, then reinitialize the game, 
 - empty players shoes and dresses and matches arrays again
 - reset the game dresses and shoes arrays
 - possibly reshuffle the players
 - determine the first player etc...


*/
