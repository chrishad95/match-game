var game = {};
var socket;
var sources = {
	bg: 'images/pixel_grid.jpg',
	shoes: 'images/shoes.png',
	dresses: 'images/dresses.png'
};

var my_id = "";

var images = {};
game.drag_start_x = 0;
game.drag_start_y = 0;

game.cards = [];
game.id = 0;


$(function () {
	if (getUrlVars()["id"]) {
		id = getUrlVars()["id"];
		console.log("found id: " + id);
	}

	loadImages(sources, initStage);

	socket = io.connect(null);

	// server is asking for our id
	socket.on('get_id', function (data) {
		if (my_id == "") {
			my_id = data.id;
		}
		socket.emit('set_id', {id: my_id});	
	});

	socket.on('alert', function (data) {
		window.alert(data.message);
	});
	socket.on('disconnect', onDisconnect);
	socket.on('connect', function () {
		if (my_id != "") {
			socket.emit('set_id', {id: my_id});	
		}
	});
	socket.on('reconnect', function () {
		if (my_id != "") {
			socket.emit('set_id', {id: my_id});	
		}
	});

	socket.on('update', function (data) {
		game.game_state = data.game_state;
		game.my_id = data.my_id;

        game.cardsLayer.destroyChildren();

		var counter = 0;
		for (d in data.game_state.shoes) {
			var card = new Kinetic.Image({
			  x: 640 + ((counter % 4) * 80),
			  y: (counter % 3) * 80 ,
			  crop: {width: 320, height: 320, x: 1280, y: 0},
			  width: 80,
			  height: 80,
			  image: images.shoes,
			  draggable: false
			});
			if (data.my_id == data.game_state.player_turn && data.game_state.players[data.my_id].action == 'get shoes') {
				card.setDraggable("true");
				card.on('dragend', function () { 
					socket.emit('get shoes', {});	
					//console.log("button1 x=" + this.getX() + " y=" + this.getY());
				
				});
			}
			game.cardsLayer.add(card);
			counter++;
			
		}

		counter = 0;
		for (d in data.game_state.dresses) {
			var row_counter = 0;
			if (counter >= 6) {
				row_counter = 1;
			}



			var card = new Kinetic.Image({
			  x: 640 + ((counter % 6) * 53),
			  y: 320 + ((row_counter % 2) * 91) ,
			  crop: {width: 450, height: 775, x: 2700, y: 0},
			  width: 53,
			  height: 91,
			  image: images.dresses,
			  draggable: false
			});
			if (data.my_id == data.game_state.player_turn && data.game_state.players[data.my_id].action == 'get dress') {
				card.setDraggable("true");
				card.on('dragend', function () { 
					socket.emit('get dress', {});	
					//console.log("button1 x=" + this.getX() + " y=" + this.getY());
				});
			}
			game.cardsLayer.add(card);
			counter++;
			
		}

		for (p in data.game_state.players) {
			console.log("display player stuff: " + p);

			// setup offset depending on which player
			var player_x_offset = 0;
			var player_y_offset = 0;

			if (data.game_state.players[p].order >1) {
				player_y_offset = 320;
			}
			if (data.game_state.players[p].order % 2 == 1) {
				player_x_offset = 320;
			}


			console.log("dresses: " + data.game_state.players[p].dresses.join(','));
			var counter = 0;

			for (d in data.game_state.players[p].dresses){
				//console.log("Dress: " + data.game_state.players[data.my_id].dresses[d]);
				// start drawing player dresses at 0,320 to 320,420
				if (data.my_id == p) {
					image_x = (data.game_state.players[p].dresses[d] % 6) * 450;
					image_y = (data.game_state.players[p].dresses[d] >= 6 ? 775: 0);

				} else {
					// show the back if the player does not own the item
					image_x = 2700;
					image_y = 0;
				}

				console.log("creating player dress: " + data.game_state.players[p].dresses[d]);
				var card = new Kinetic.Image({
				  x: player_x_offset + ((counter % 6) * 53),
				  y: player_y_offset,
				  crop: {width: 450, height: 775, 
				  	x: image_x,
					y: image_y},
				  width: 53,
				  height: 91,
				  image: images.dresses,
				  draggable: false
				});
				game.id++;
				game.cardsLayer.add(card);
				card.setId(game.id);
				console.log("storing card info for card: " + card.getId());
				game.cards[card.getId()] = {};
				game.cards[card.getId()].player = p;
				game.cards[card.getId()].item_value = data.game_state.players[p].dresses[d];
				game.cards[card.getId()].startX = card.getX();
				game.cards[card.getId()].startY = card.getY();
				console.log("card info" + game.cards[card.getId()]);

				if (data.my_id == data.game_state.player_turn && data.game_state.players[data.my_id].action == 'exchange dress') {

					console.log("setting dragend event card:" + card.getId());
					card.on('dragend', function () { 

						// upper left quadrant
						if (this.getX() < 320 && this.getY() < 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[0]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].dresses.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange dress', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange dress', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();

							}
						}

						// upper right quadrant
						if (this.getX() >= 320 && this.getX() < 640 && this.getY() < 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[1]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].dresses.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange dress', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange dress', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();
							}
						}

						// lower left quadrant
						if (this.getX() < 320 && this.getY() >= 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[2]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].dresses.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange dress', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange dress', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();
							}
						}

						// lower right quadrant
						if (this.getX() >= 320 && this.getX() < 640 && this.getY() >= 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[3]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].dresses.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange dress', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange dress', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();
							}
						}

					}); // end of on drag end event

					// if i have dresses then i can only drag mine to initiate an exchange
					// but if I do not have any, then I can drag a dress from another player
					if (game.game_state.players[game.my_id].dresses.length == 0) {  
						card.setDraggable("true");
					} else {
						// this is my dress so I can drag it to initiate an exchange
						if (p == game.my_id) {
							card.setDraggable("true");
						}
					}
				}
				counter++;
			}

			console.log("shoes: " + data.game_state.players[p].shoes.join(','));
			var counter = 0;
			for (d in data.game_state.players[p].shoes){
				//console.log("Dress: " + data.game_state.players[p].dresses[d]);
				// start drawing player shoes at 0,420 to 320,480

				var shoe_row = 0;
				if (data.game_state.players[p].shoes[d] >= 4) {
					if (data.game_state.players[p].shoes[d] >= 8) {
						shoe_row = 2;
					} else {
						shoe_row = 1;
					}
				}

				if (data.my_id == p) {
					image_x = (data.game_state.players[p].shoes[d] % 4) * 320;
					image_y = 320 * shoe_row;

				} else {
					image_x = 1280;
					image_y = 0;
				}

				var card = new Kinetic.Image({
				  x: player_x_offset + ((counter % 6) * 53),
				  y: 100 + player_y_offset ,
				  crop: {width: 320, height: 320, 
				  	x: image_x, 
					y: image_y },
				  width: 53,
				  height: 53,
				  image: images.shoes,
				  draggable: false
				});
				game.id++;
				card.setId(game.id);
				game.cardsLayer.add(card);
				game.cards[card.getId()] = {};
				game.cards[card.getId()].player = p;
				game.cards[card.getId()].item_value = data.game_state.players[p].shoes[d];
				game.cards[card.getId()].startX = card.getX();
				game.cards[card.getId()].startY = card.getY();

				if (data.my_id == data.game_state.player_turn && data.game_state.players[data.my_id].action == 'exchange shoes') {
					card.on('dragend', function () { 

						// upper left quadrant
						if (this.getX() < 320 && this.getY() < 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[0]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].shoes.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange shoes', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange shoes', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();
							}
						}

						// upper right quadrant
						if (this.getX() >= 320 && this.getX() < 640 && this.getY() < 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[1]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].shoes.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange shoes', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange shoes', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();
							}
						}

						// lower left quadrant
						if (this.getX() < 320 && this.getY() >= 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[2]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].shoes.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange shoes', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange shoes', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();
							}
						}

						// lower right quadrant
						if (this.getX() >= 320 && this.getX() < 640 && this.getY() >= 320) {
							if (game.cards[this.getId()].player != game.game_state.player_order[3]) {
								if (game.cards[this.getId()].player != game.my_id) {
									// not my piece
									if (game.game_state.players[game.my_id].shoes.length == 0) {
										// i don't have any, so i am getting one from another player.
										socket.emit('exchange shoes', 
											{exchange_player: game.cards[this.getId()].player, item_id: ""});
									} 
								} else {
									socket.emit('exchange shoes', 
										{exchange_player: game.cards[this.getId()].player, item_id: game.cards[this.getId()].item_value});
								}
							} else {
								// reset
								console.log("reset the piece: x:" + game.cards[this.getId()].startX + " y: " + game.cards[this.getId()].startY); 
								this.move(this.getX() - game.cards[this.getId()].startX, this.getY() - game.cards[this.getId()].startY);
        						game.cardsLayer.draw();
							}
						}

					});

					// if i have shoes then i can only drag mine to initiate an exchange
					// but if I do not have any, then I can drag a shoes piece from another player
					if (game.game_state.players[game.my_id].shoes.length == 0) {  
						card.setDraggable("true");
					} else {
						// this is my shoes piece so I can drag it to initiate an exchange
						if (p == game.my_id) {
							card.setDraggable("true");
						}
					}
				}
				counter++;
			}

			console.log("matches: " + data.game_state.players[p].matches.join(','));
			var counter = 0;
			for (d in data.game_state.players[p].matches){

				// start drawing player matches at 0,480 to 320,640

				var card = new Kinetic.Image({
				  x: player_x_offset + ((counter % 3) * 106),
				  y: player_y_offset + 160,
				  crop: {width: 450, height: 775, 
				  	x: (data.game_state.players[p].matches[d] % 6) * 450, 
					y: (data.game_state.players[p].matches[d] >= 6 ? 775: 0)},
				  width: 63,
				  height: 110,
				  image: images.dresses,
				  draggable: false
				});
				game.cardsLayer.add(card);

				var shoe_row = 0;
				if (data.game_state.players[p].matches[d] >= 4) {
					if (data.game_state.players[p].matches[d] >= 8) {
						shoe_row = 2;
					} else {
						shoe_row = 1;
					}
				}

				// draw a dress and matching shoes
				var card = new Kinetic.Image({
				  x: player_x_offset + ((counter % 3) * 106),
				  y: player_y_offset + 160 + 110 ,
				  crop: {width: 320, height: 320, 
				  	x: (data.game_state.players[p].matches[d] % 4) * 320, 
					y: 320 * shoe_row},
				  width: 50,
				  height: 50,
				  image: images.shoes,
				  draggable: false
				});
				game.cardsLayer.add(card);
				counter++;
			}
        	game.cardsLayer.draw();
		}

		if (data.game_state.player_turn == data.my_id) {
			console.log("it is my turn to " + data.game_state.players[data.my_id].action);
			if (data.game_state.players[data.my_id].action == "Roll") {
				// show the Roll button

		      game.btnRoll  = new Kinetic.Text({
		        x: 640,
		        y: 280,
		        text: 'Roll',
		        fontSize: 16,
		        fontFamily: 'Calibri',
		        fill: '#000',
		        width: 100,
		        padding: 20,
		        align: 'right'
		      });

				game.btnRoll.on('click', clickRoll);
			  game.buttonLayer.add(game.btnRoll);
			  game.buttonLayer.draw();
			}

			if (data.game_state.players[data.my_id].action == "get dress") {
				// let the player get a dress
			/*
		      game.btnRoll  = new Kinetic.Text({
		        x: 50,
		        y: 100,
		        text: 'Roll',
		        fontSize: 16,
		        fontFamily: 'Calibri',
		        fill: '#000',
		        width: 100,
		        padding: 20,
		        align: 'right'
		      });

				game.btnRoll.on('click', clickRoll);
			  game.buttonLayer.add(game.btnRoll);
			  game.buttonLayer.draw();
			  */
			}

		}
	});
	
	setInterval(update, 3000);
});


function update() {
	socket.emit('update',{});
}

function initStage(images) {
	var stage = new Kinetic.Stage({
	  container: 'container',
	  width: 960,
	  height: 640
	});

	var bgLayer = new Kinetic.Layer();
	bgLayer.add( new Kinetic.Image({
  	image: images.bg,
  	x: 0,
  	y: 0
  }));

	game.buttonLayer = new Kinetic.Layer();
	game.cardsLayer = new Kinetic.Layer();

	stage.add(bgLayer);
	stage.add(game.buttonLayer);
	stage.add(game.cardsLayer);
}

function loadImages(sources, callback) {
	var assetDir = '';
	images = {};
	var loadedImages = 0;
	var numImages = 0;
	for(var src in sources) {
		numImages++;
	}
	for(var src in sources) {
	  images[src] = new Image();
	  images[src].onload = function() {
	    if(++loadedImages >= numImages) {
	      callback(images);
	    }
	  };
	  images[src].src = assetDir + sources[src];
	}
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

function clickRoll() {
	console.log("clicked roll button");
	socket.emit("Roll", {});
}

function getUrlVars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}
function onDisconnect() {
	console.log("I have been disconnected.");
}
