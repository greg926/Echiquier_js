const chessboardParent = document.getElementById('chessboard');
const chessboardParentLetters = document.querySelector('.letters');
const chessboardParentNumbers = document.querySelector('.numbers');

let letters = ["A","B","C","D","E","F","G","H"];
let index = 0;
let black = false;
let num = 1;

for (let i = 0; i < 8; i++) {

    let letter = document.createElement('li');
    letter.textContent = letters[i];
    chessboardParentLetters.appendChild(letter);

    let numbers = document.createElement('li');
    numbers.textContent = num ++;
    chessboardParentNumbers.appendChild(numbers);
}



// Jeu d'échecs
class Chess {
	constructor() {
		this.setDefault();
	}

	// Définir les informations sur les échecs comme valeur par défaut
	setDefault() {
		this.info = {
			preview: false, // Lors de la prévisualisation de l'historique des matchs
			started: false, // Quand le jeu a commencé
			ended: false, // Quand le jeu est terminé
			won: null, // Joueur Gagnant
			turn: null, // Tour du joueur
	
		};

		this.data = {
			players: [], // Tous les joueurs
			matchHistory: [], // Stockage de l'historique des match
			board: null, 
		};
	}

	// Initialise le jeu
	async init(callback) {
		// Créer un nouveau tableau
		this.data.board = new Board(this);
		// Ensuite, créer des éléments dans le tableau
		this.data.board.create();

		// Affecte les joueurs
		await this.assignPlayers();

		// S'assure que les joueurs sont prêts
		await this.data.players[0].init(this);
		await this.data.players[1].init(this);

		callback && callback.call(this);
	}

	// Affecter le joueur 1 et 2 (player1,player2)
	async assignPlayers() {
		// Retourne une promesse
		return new Promise((resolve) => {
			const player1 = new Player({ username: "Mr White", id: 1, role: "white" }); // Mr White est player 1
			const player2 = new Player({ username: "Mr Black", id: 2, role: "black" }); // Mr Black est player 2

			this.data.players = [player1, player2]; // Affecter dans le jeu des joueurs

			// Joueur 1 (Blanc) est le premier à bouger l'une des pièces pour commencer la partie
			this.info.turn = player1;
			player1.info.isTurn = true;

			resolve(); // return
		});
	}

	// Quand le jeu démarre
	start() {
		this.info.started = true;
		this.info.ended = false;
		this.info.won = false;

		this.data.board.placePiecesAsDefault(); // Et placent les pièces du joueur par défaut
	}

	notify() {
		const players = this.data.players;
		const ischecked = players[0].info.isChecked || players[1].info.isChecked;
		const checkedPlayer = this.checkedPlayer();
		ischecked && console.log(checkedPlayer.data.username + "  is checked");
	}

	// Quand il y a un vainqueur
	winner() {
		const Winner = this.info.won;
		const CreatePopUp = function () {};

		console.log(`The winner is ${Winner.data.username}`);

		CreatePopUp();
	}

	// Termine le jeu
	checkmate(player) {
		this.info.started = false;
		this.info.ended = true;
		this.info.won = player;

		console.log(`${this.info.turn.data.username} is Mate`);

		this.winner();
	}

	updatePlayers() {
		this.data.players.forEach((player) => player.update());
	}

	checkedPlayer() {
		const players = this.data.players;
		return players.filter((player) => {
			return player.info.isChecked == true;
		})[0];
	}

	// Changer de joueur
	changeTurn() {
		const turn = this.info.turn;
		const players = this.data.players;
		this.info.turn = players.filter((p, index) => {
			return players.indexOf(turn) != index;
		})[0];
	}

	
	switchTurn(player) {
		const players = this.data.players;
		return players.filter((p, index) => {
			return players.indexOf(player) != index;
		})[0];
	}

	// Test et vérifie le déplacement, qu'il soit vérifié ou non
	// Puis alert, lorsque la pièce ne peut pas être déplacée
	testMove(piece, square) {
		const board = this.data.board;
		piece = board.filterPiece(this, piece); // Sélection une pièce
		square = board.filterSquare(square); // Sélection une ou des cases pour le déplacement de la pièce

		if (!piece || !square) return false;
		const backup = { square: piece.square, piece: square.piece }; // Sauvegarde les données actuelles
		let player = backup.piece ? backup.piece.player : null;
		let pieces = backup.piece ? player.data.pieces : null;
		let index = backup.piece ? pieces.indexOf(backup.piece) : null; 
		let status = false;

		// s'il y a une pièce, la retirer du tableau
		index && pieces.splice(index, 1);

		// Déplace la pièce
		piece.silentMove(square);

		// Vérifie comment l'échiquier réagit, quelles sont les possibilités
		status = this.data.board.analyze(); // Retourne "false", si c'est vérifié

		// Remet la pièce dans sa position
		piece.silentMove(backup.square);

		// Place la pièce dans sa case
		square.piece = backup.piece;

		// Et place à nouveau sur l'échiquier
		index && pieces.splice(index, 0, backup.piece);

		return status;
	}

	// Après le déplacement du joueur
	moved(...param) {
		this.data.board.resetSquares(); // Réinitialisation des cases possibles ui
		this.data.board.setMovedSquare(...param);
		this.changeTurn(); // Si le joueur se déplace, changer le joueur de tour
		this.notify(); // Met à jour alert et prompt
		this.isMate(); // Vérifie si c'est mat
		this.updatePlayers(); // Mise à jour des joueurs
		this.insertToMatchHistory(...param); // Insére dans l'historique des matchs
	}

	// Insére les coups dans l'historique des matchs
	insertToMatchHistory(from, to) {
		const move = {
			piece: to.piece.getAlias(),
			from: from.info.position,
			to: to.info.position,
		};

		this.data.matchHistory.push(move);
		to.piece.player.data.movesHistory.push(move);
		console.log(JSON.stringify(this.data.matchHistory));
	}

	// Charger l'historique des matchs avant sa prévisualisation
	async loadMatchHistory(matchHistoryJsonFile) {
		const isjson = typeof matchHistoryJsonFile == "object";
		const isString = typeof matchHistoryJsonFile == "string";

		// Quand ce n'est pas json ou une url string
		if (!isjson && !isString) {
			throw new Error("Historique du match invalide !");
		}

		// Si c'est une url, on la récupére avec fetch
		if (isString) {
			try {
				matchHistoryJsonFile = await fetch(matchHistoryJsonFile);
				matchHistoryJsonFile = await matchHistoryJsonFile.json();
			} catch (e) {
				// Si quelque chose ne va pas, on lance le message d'erreur
				throw new Error("Erreur, Impossible de charger l'historique des matchs !");
			}
		}

		// notify si l'historique des matchs est vide
		if (matchHistoryJsonFile.length == 0) {
			throw new Error("Historique des matchs vides !");
		} else {
			// sinon, le prévisualiser
			this.previewMatchHistory(matchHistoryJsonFile);
		}
	}

	//  preview de l'historique des matchs
	async previewMatchHistory(matchHistory, index = 0) {
		const board = this.data.board;
		// Indique si on est en train de prévisualiser
		// pour que le joueur ne puisse pas bouger
		this.info.preview = true;

		

		for (let i = 0; i < matchHistory.length; i++) {
			let player = this.data.players[index]; // Le joueur
			let piece = board.filterPiece(player, matchHistory[i].piece); // Converti la pièce en class
			let square = board.filterSquare(matchHistory[i].to); // Trouve la case
			let move = await moveTo(player, piece, square); // Déplace la pièce

			// Si il y a une erreur dans un mouvement, alors on lance un message d'erreur
			if (!move)
				throw new Error(
					`Quelque chose ne va pas, le mouvement ${matchHistory[i].from} to ${matchHistory[i].to} n'est pas correct`
				);

			index = index == 0 ? 1 : 0;
		}

		// La prévisualisation est terminée, le joueur peut bouger maintenant
		this.info.preview = false;
	}

	// Le jeu d'échecs est prêt
	isReady() {
		return this.info.started && !this.info.ended && !this.info.won;
	}

	// Vérifie si le joueur est mat
	isMate() {
		const playerTurn = this.info.turn; // au tour du joueur
		const pieces = playerTurn.data.pieces; // pièce du joueur
		const King = this.data.board.findPiece(pieces, "King", true); // Roi trouvé
		const moves = []; // Stock les coups possibles

		// Si le joueur est vérifié
		if (playerTurn.info.isChecked) {
			for (const piece of pieces) {
				for (const square of piece.getPossibilities().moves) {
					if (this.testMove(piece, square)) {
						// Si il y a un coup réussi
						// insérer ce coup dans le tableau
						moves.push(piece);
					}
				}
			}

			// Si il n'y a pas de coup possible, et que le Roi n'a pas de coup non plus.
			// alors échec et mat
			if (!moves.length && !King.getPossibleSqOnly()) {
				this.checkmate(this.switchTurn(playerTurn));
				return true;
			}
		}
	}
}

// Echiquier
class Board {
	constructor(game) {
		this.default = {
			col_row: 8, 
			col: ["a", "b", "c", "d", "e", "f", "g", "h"], 
			row: [8, 7, 6, 5, 4, 3, 2, 1], 
		};

		this.game = game; // Jeu
		this.data = []; // Valeurs de données vides
	}

	// Création d'une interface utilisateur
	create() {
		const col_row = this.default.col_row;
		const col = this.default.col;
		const row = this.default.row;

		let role = "white"; // Commencer la partie avec les blanc

		// Changement de rôle
		const setRole = () => {
			return (role = role == "white" ? "black" : "white");
		};

		for (let r = 0; r < col_row; r++) {
			const squares = []; // Stock toutes les cases
			for (let c = 0; c < col_row; c++) {
				const letter = col[c];
				const number = row[r];
				const position = `${letter}${number}`; // Nouvelle position
				const boardPos = { y: r, x: c };
				const square = new Square(boardPos, position, setRole(), this.game); // Nouvelle case

				squares.push(square); // Pousse la case
			}

			this.data.push(squares) && setRole(); // Pousse les cases dans les données du tableau
		}
	}

	// Place la pièce par défaut sur l'échiquier
	placePiecesAsDefault() {
		const board = this;
		const game = this.game; // Jeu
		const players = game.data.players; // Tous les joueurs

		const place = function (piece) {
			const position = piece.info.position; // Position de la pièce
			const square = board.filterSquare(position); // Sélectionne la case en fonction de sa position
			const pieceElement = piece.info.element; // Image de la pièce
			const squareElement = square.info.element; // et l'élément de la case

			piece.square = square; 
			square.piece = piece; 

			squareElement.appendChild(pieceElement); // Ajoute l'image sur la case
		};

		// Passe en boucles les joueurs et placent leur pièces
		players.forEach((player) => player.data.pieces.forEach(place));
	}

	// Toutes les possibilités des joueurs
	// ennemis, déplacement
	getAllPossibilities() {
		const players = this.game.data.players; // Joueurs
		const white = players[0].analyze(); // Joueur 1 player 1
		const black = players[1].analyze(); // Joueur 2 player 2

		return { white, black };
	}

	// Analyse l'échiquier
	analyze() {
		let status = true; // Stat
		let turnPlayer = this.game.info.turn;
		let AP = this.getAllPossibilities(); // Toutes les possibilités des joueurs
		let entries = Object.entries(AP); // Converti en objet

		// Passe en boucle les joueurs et collectent leurs ennemis
		for (let data of entries) {
			const King = this.findPiece(data[1].enemies, "King");
			if (King) {
				King.player.info.isChecked = true;
				// Si le rôle du joueur du tour est égal au rôle du joueur du roi
				if (turnPlayer.data.role != data[0]) {
					status = false; 
					King.player.info.isChecked = false;
				}
				break;
			}
		}

		return status;
	}

	// Classes de réglage et possibilités
	setSquarePossibilities(possibilities, insertUI) {
		if (!possibilities) return;
		let { moves, enemies, castling } = possibilities;

		// Réinitialise en premier
		this.resetSquares();

		// Puis définit les propriétés des cases en fonction des valeurs possibles
		moves.forEach((square) => square.setAs("move", true, insertUI));
		enemies.forEach((square) => square.setAs("enemy", true, insertUI));
		castling.forEach((square) => square.setAs("castling", true, insertUI));
	}

	// Supprime toutes les class de tous les cases
	resetSquares() {
		for (let squares of this.data) {
			for (let square of squares) {
				square.setAs("move", false, true);
				square.setAs("enemy", false, true);
				square.setAs("castling", false, true);
				square.setAs("from", false, true);
				square.setAs("to", false, true);
			}
		}
	}

	setMovedSquare(from, to) {
		from.setAs("from", true, true);
		to.setAs("to", true, true);
	}

	// Vérifie si la position x et y est valide sur l'échiquier
	isValidPos(y, x) {
		return this.data[y] ? this.data[y][x] : false;
	}

	// Convertira la case de la position en Objet Case
	// e4 => Square
	filterSquare(sq) {
		// Vérifie si c'est déjà un objet
		if (!sq || typeof sq == "object") return sq;

		// Boucle dans l'échiquier
		for (let squares of this.data) {
			// Boucle dans les cases
			for (let square of squares) {
				// Vérifie si la case de la position est égal à la position donnée
				if (square.info.position == sq) {
					return square;
				}
			}
		}
	}

	// Convertira l'alias de la pièce en Objet Piece
	// wP4 => Piece
	filterPiece(player, piece) {
		// Vérifie si il s'agit déjà d'un objet
		if (!piece || !player || typeof piece == "object") return piece;

		const pieces = player.data.pieces; // Pièces du joueur
		const alias = piece.substring(0, 2); // alias
		const index = piece.charAt(2); // index

		// Boucles entre les pièces
		for (let piece of pieces) {
			// Vérifie si l'alias et l'index sont corrects
			// la retourne
			if (piece.info.alias == alias) {
				if (piece.info.index == index) {
					return piece;
				}
			}
		}
	}

	// Trouve une pièce dans un tableau de pièce ou un tableau de la case
	findPiece(squares, piece, isPieces) {
		if (!squares || !squares.length || !piece) return false;

		// Si ce n'est pas un objet, alors il suffit de retourner la pièce, ce qui signifie que c'est un alias ou le nom de la pièce
		piece = this.filterPiece(piece) ?? piece;

		const filter = squares.filter((square) => {
			const p = isPieces
				? square
				: typeof square == "object"
				? square.piece
				: this.filterSquare(square).piece; // La pièce
			const name = piece.info ? piece.info.name : piece; // Nom de la pièce
			const alias = piece.info ? piece.info.alias : piece; // L'alias de la pièce
			return p.info.name == name || p.info.alias == alias; // Trouve la pièce où l'alias ou le nom est égal à la pièce donné
		});

		return (
			filter.map((sq) => {
				return this.filterSquare(sq).piece ?? sq;
			})[0] ?? false
		);
	}
}

// Pièce d'échecs
class Piece {
	constructor(pieceObj, player, game) {
		this.info = {
			...pieceObj, // Information sur les pièces
			fastpawn: pieceObj.name == "Pawn", // Seulement si le pion
			castling: pieceObj.name == "King", // Seulement si le roi
			element: null,
		};

		this.data = {}; // si bug
		this.player = player; // Joueur
		this.game = game; // Jeu

		this.init();
	}

	init() {
		this.create(); // Crée un nouvel élement Image
		this.listener(); // 
	}

	// Quand il y a des pièces à l'intérieur de la case cible, les manger
	eat(piece) {
		if (!piece) return;
		const piecePlayer = piece.player;
		const player = this.player;

		// Si l'élément existe, supprime l'élément
		piece.info.element && piece.info.element.remove();

		// Insére dans le joueur cible, les pièces tombées
		piecePlayer.data.dropped.push(piece);
		// Retire la pièce dans les pièces du joueur cible
		piecePlayer.data.pieces.splice(piecePlayer.data.pieces.indexOf(piece), 1);
		// Insére les pièces mangés par le joueur 
		player.data.eated.push(piece);

		return piece;
	}

	moveElementTo(square) {
		this.info.fastpawn = false;
		this.info.castling = false;

		// Ajoute l'élément dans l'élément case cible
		square.info.element.appendChild(this.info.element);
	}

	// Se déplace de la case actuelle vers la case cible
	move(square, castling) {
		let old = this.square;
		// Mange la pièce à l'intérieur
		this.eat(square.piece);
		// Déplace la pièce dans la case
		this.silentMove(square);
		// Déplace l'image dans l'élément case
		this.moveElementTo(square);

		// Déclenche le mouvement final
		this.game.moved(old, square);

		// si le coup est un roque, alors roque
		castling && this.castling();
	}

	// Se déplace en arrière-plan
	silentMove(square) {
		const piece = this;
		const board = this.game.data.board;

		// Assure qu'il s'agit d'un objet case
		square = board.filterSquare(square);

		
		square.piece = false;
		piece.square.piece = false;

		// Change les données
		square.piece = piece;
		piece.square = square;
		piece.info.position = square.info.position;
		piece.square.piece = piece;
	}

	// Roque
	castling() {
		// Roque seulement s'il est roi
		if (this.info.name != "King") return false;

		const game = this.game;
		const board = game.data.board.data;
		const { x, y } = this.square.info.boardPosition;

		const check = function (piece, square, condition) {
			// Se déplace si la condition est true
			if (!condition) return;

			// Déplace la pièce dans la case
			piece.silentMove(square);
			// Déplace l'élément dans l'élément case
			piece.moveElementTo(square);
		};

		// Tour de droite et de gauche
		const rr = board[y][x + 1].piece;
		const lr = board[y][x - 2].piece;

		// Vérifie chaque pièce Tour
		check(rr, board[y][x - 1], rr && rr.info.name == "Rook");
		check(lr, board[y][x + 1], lr && lr.info.name == "Rook");
	}

	create() {
		const pieceElement = new Image(); // Nouvel élément Image
		const classname = "chessboard-piece";

		// apply
		pieceElement.src = `./assets/media/pieces/${this.info.alias}.png`;
		pieceElement.classList.add(classname);

		this.info.element = pieceElement; // Stocker
	}

	listener() {
		const piece = this; // Pièce sélectionnée
		const game = this.game; // Jeu
		const element = this.info.element; // Image de la pièce
		const board = game.data.board; // échiquier

		// on mousedown event
		const mousedown = function (event) {
			let current = null; // Définit comme null, case cible
			let elemBelow, droppableBelow; // Positionnement des cases

			// Si le joueur visualise l'historique du match
			// retourne false
			if (game.info.preview) return;

			// Déplace la pièce vers la direction
			const move = function (pageX, pageY) {
				element.style.cursor = "grabbing"; // Définit le curseur avec un effet de saisie
				element.style.left = pageX - element.offsetWidth / 2 + "px";
				element.style.top = pageY - element.offsetHeight / 2 + "px";
			};

			// Lorsque l'utilisateur déplace la souris
			const mousemove = function (event) {
				move(event.pageX, event.pageY); // Déplace la pièce dans la position de la souris

				element.hidden = true; // Masque l'élément afin qu'il n'affecte pas le point de recherche
				elemBelow = document.elementFromPoint(event.clientX, event.clientY); // Recherche à partir des points x et y
				element.hidden = false; 

				if (!elemBelow) return;

				// Trouve la case le plus proche de la souris 
				droppableBelow = elemBelow.closest(".chessboard-square");

				// Si il ne s'agit pas de la case actuelle
				if (current != droppableBelow) current = droppableBelow;
			};

			// Lorsque l'utilisateur laisse tomber la pièce
			const drop = function () {
				// Supprime d'abord l'événement du déplacement de la souris
				document.removeEventListener("mousemove", mousemove);

				// Et assigne les styles pour revenir à sa position dans la case
				element.removeAttribute("style");

				if (!current) return false;
				if (game.info.turn != piece.player) return false;

				piece.player.move(piece, current.getAttribute("data-position"));
			};

			// Définir les styles
			const setStyle = function () {
				// Définit la position comme absolute pour l'image puisse être déplacée n'importe où sur l'écran
				element.style.position = "absolute";
				// Définit le z-index au max pour qu'il passe au-dessus de tous les éléments
				element.style.zIndex = 1000;
			};

			
			const manageListener = function () {
				
				element.onmouseup = drop;

				
				element.ondragstart = function () {
					return false;
				};

				
				document.addEventListener("mousemove", mousemove);
			};

			// Déclaration
			setStyle();
			manageListener();
			move(event.pageX, event.pageY);

			if (game.info.turn != piece.player) return false;
			
			board.setSquarePossibilities(piece.getPossibleSqOnly(), true);

			piece.player.data.currentPiece = piece;
		};

		
		element.addEventListener("mousedown", mousedown);
	}

	// Obtiens les possibilités de la pièce, le déplacement, les ennemis, le roque
	getPossibilities() {
		const piece = this; // La pièce actuelle
		const square = this.square; // la place actuelle où se trouve la pièce
		const player = this.player; // Le tour du joueur
		const role = player.data.role; // Le rôle du joueur ex : values(white, black)
		const game = this.game; // Jeu
		const gameboard = game.data.board; // L'échiquier
		const board = gameboard.data; 
		const pos = { moves: [], enemies: [], castling: [] }; 
		let { x, y } = square.info.boardPosition; 

		// Vérifie si la pièce à l'intérieur de la case donné est ennemi ou non
		// Si c'est le cas, le pousser en position d'ennemis
		const testEnemy = function (y, x) {
			// Vérifie si la position est valide
			if (!gameboard.isValidPos(y, x)) return false;

			const square = board[y][x]; // La case cible
			const piece = square.piece; // Pièce dans la case cible

			if (!square || !piece) return false;
			if (piece.player.data.role == role) return false;

			pos.enemies.push(square);
		};

		// Test la case lorsque la pièce peut être déplacée ou lorsqu'il y a un ennemi
		const testSquare = function (y, x) {
			// Vérifie si la position est valide
			if (!gameboard.isValidPos(y, x)) return false;

			const square = board[y][x]; // La case cible
			const sqpiece = square.piece; // Pièce dans la case cible

			if (!square) return false;

			if (sqpiece) {
				if (piece.info.name != "Pawn") testEnemy(y, x);
				return false;
			} else {
				pos.moves.push(square);
				return true;
			}
		};

		const testLoopSquare = function (yi, yo, xi, xo, un = 8, is) {
			for (let i = 1; i < un; i++) {
				const ny = yi ? (yo ? y + i : y - i) : y;
				const nx = xi ? (xo ? x + i : x - i) : x;

				// Vérifie si la position est valide
				if (!gameboard.isValidPos(ny, nx)) return false;

				const square = board[ny][nx]; // La case cible
				const sqpiece = square.piece; // Pièce dans la case cible

				if (square) {
					if (sqpiece) {
						// Si ce n'est pas un pion, tester si il y a une ennemi
						if (piece.info.name != "Pawn") testEnemy(ny, nx);
						break;
					} else if (is && i == 2) {
						// Si isKing, alors on vérifie puis exécute comme un seul et unique dans une boucle

						const check = function (condition) {
							if (condition) pos.castling.push(square);
						};

						const rightrook = board[ny][nx + 1].piece;
						const leftrook = board[ny][nx - 2].piece;

						check(rightrook && rightrook.info.name == "Rook");
						check(leftrook && leftrook.info.name == "Rook");
					}

					pos.moves.push(square);
				}
			}
		};

		// Déplacement des pièces de l'échiquier
		const Pattern = {
			// Pion
			Pawn: function () {
				// Vérifie si un pion peut faire le coup "Prise en passant",et si c'est le cas, incrémenter de 1 son mouvement possible
				let until = piece.info.fastpawn ? 3 : 2;

				
				for (let i = 1; i < until; i++) {
					if (role == "white") {
						// Si le pion est blanc, soustraire la valeur i actuelle
						// pour qu'il se déplace de bas vers le haut
						if (!testSquare(y - i, x)) break;
					} else {
						// Si le pion est noir, on additionne la valeur i actuelle
						// pour que le pion se déplace de haut vers le bas
						if (!testSquare(y + i, x)) break;
					}
				}

				// Détection de l'ennemi
				if (role == "white") {
					// Si Blanc , vérifie la case supérieur gauche et droite de sa position
					testEnemy(y - 1, x - 1);
					testEnemy(y - 1, x + 1);
				} else {
					// Sinon si Noir, Vérifie la case inférieur gauche et droite de sa position
					testEnemy(y + 1, x - 1);
					testEnemy(y + 1, x + 1);
				}
			},
			
			// Tour
			Rook: function () {
				// Top
				testLoopSquare(true, false, false, false);
				// Bottom
				testLoopSquare(true, true, false, false);
				// Left
				testLoopSquare(false, false, true, false);
				// Right
				testLoopSquare(false, false, true, true);
			},

			// Fou
			Bishope: function () {
				// Top left
				testLoopSquare(true, false, true, false);
				// Bottom Left
				testLoopSquare(true, true, true, false);
				// Top Right
				testLoopSquare(true, false, true, true);
				// Bottom Right
				testLoopSquare(true, true, true, true);
			},

			Knight: function () {
				// Top
				testSquare(y - 2, x - 1);
				testSquare(y - 2, x + 1);
				// Bottom
				testSquare(y + 2, x - 1);
				testSquare(y + 2, x + 1);
				// Left
				testSquare(y - 1, x - 2);
				testSquare(y + 1, x - 2);
				// Right
				testSquare(y - 1, x + 2);
				testSquare(y + 1, x + 2);
			},

			Queen: function () {
				Pattern.Rook(); // Peut se déplacer comme la tour
				Pattern.Bishope(); // Peut se déplacer comme le fou
			},

			King: function () {
				// Top
				testSquare(y - 1, x);
				// Bottom
				testSquare(y + 1, x);
				// Top Left
				testSquare(y - 1, x - 1);
				// Top Right
				testSquare(y - 1, x + 1);
				// Bottom Left
				testSquare(y + 1, x - 1);
				// Bottom Right
				testSquare(y + 1, x + 1);

				if (piece.info.castling) {
					testLoopSquare(false, false, true, true, 3, true);
					testLoopSquare(false, false, true, false, 3, true);
				}
			},
		};


		Pattern[this.info.name].call();

		return pos;
	}

	getPossibleSqOnly() {
		let { moves, enemies, castling } = this.getPossibilities();
		const game = this.game;

		const filter = (s) => {
			return s.filter((sq) => {
				return game.testMove(this, sq);
			});
		};

		game.data.board.resetSquares();
		moves = filter(moves);
		enemies = filter(enemies);
		castling = filter(castling);

		return moves.length || enemies.length || castling.length
			? { moves, enemies, castling }
			: false;
	}

	getAlias() {
		return `${this.info.alias}${this.info.index}`;
	}
}

// Case d'échiquier
class Square {
	constructor(boardPosition, position, role, game) {
		this.info = {
			boardPosition, // Position sur la case de l'échiquier
			position, // Position de la case
			role, // Role de la case
			element: null, // l'élément de la case
			isMove: false, // Possibilité de déplacement
			isEnemy: false, // Ennemi possible
			isCastle: false, 
		};

		this.piece = null; // La pièce
		this.game = game; // Jeu

		this.init();
	}

	// Initialise
	init() {
		this.create(); 
		this.listener(); 
	}

	// Crée l'interface utilisateur
	create() {
		const squareElement = document.createElement('div'); // Nouvelle élément div
		const classname = "chessboard-square"; // élément avec le nom de la class

		squareElement.classList.add(classname); // Ajoute
		squareElement.setAttribute("role", this.info.role); // Rôle défini
		squareElement.setAttribute("data-position", this.info.position); // et la position

		chessboardParent.appendChild(squareElement); // Ajoute au parent
		this.info.element = squareElement; // Stock
	}

	listener() {
		// Action lorsque le joueur clique sur la case
		const action = function () {
			const player = this.game.info.turn;
			const info = this.info;
			const isQualified = info.isMove || info.isEnemy || info.isCastle;
			const currentPiece = player.data.currentPiece;

			if (!isQualified || !currentPiece) return false;

			// Déplace la pièce du joueur sur la ou les cases sélectionnées
			player.move(currentPiece, this);
		};

		this.info.element.addEventListener("click", action.bind(this));
	}

	setAs(classname, bool, ui) {
		const element = this.info.element;

		this.info.isEnemy = classname == "enemy" && bool; // Si l'ennemi est sur la case
		this.info.isMove = classname == "move" && bool; // Si il est possible de déplacer la pièce
		this.info.isCastle = classname == "castling" && bool; // Si l'on peut "roquer" dans cette position

		if (!ui) return;
		// Ajoute la class si true, la supprime si false
		bool
			? element.classList.add(classname)
			: element.classList.remove(classname);
	}
}

// Joueur
class Player {
	constructor(player) {
		this.info = {
			isTurn: false, // est le tour du joueur
			isWinner: false, // est gagnant
			isStarted: false, // le joueur a commencé à se déplacer
			isLeave: false, // le joueur a quitté
			isChecked: false, // le joueur a été checké
			isReady: false, // le joueur est prêt à jouer
		};

		this.data = {
			...player, // réécrit les informations sur les joueurs
			piecesData: {}, // Données des pièces
			pieces: [], // Liste des pièces
			dropped: [], // Toutes les pièces que l'ennemi tue
			eated: [], // Les pièces mangés
			moves: [], // Total des coups possibles
			enemies: [], // Nombre total d'ennemis possibles
			movesHistory: [], // Historique des mouvements du joueur
			currentPiece: null, 
			card: null,
		};

		this.game = null; // partie vide
	}

	// Analyse du côté des joueurs
	analyze() {
		this.data.moves = []; // Vide le tableau
		this.data.enemies = []; // Vide le tableau

		const game = this.game; // Jeu
		const turnPlayer = game.info.turn;
		const pieces = this.data.pieces; // Pièces des joueurs
		const pos = { moves: [], enemies: [], castling: [] }; // Stock

		// Boucle entre les pièces
		for (const piece of pieces) {
			for (const data of Object.entries(piece.getPossibilities())) {
				for (const square of data[1]) {
					if (!square) return;
					if (!pos[data[0]].includes(square.info.position)) {
						pos[data[0]].push(square.info.position);
					}
				}
			}
		}

		this.data.moves = pos.moves; 
		this.data.enemies = pos.enemies; 
		this.info.isTurn = turnPlayer.data.username == this.data.username; 

		return pos;
	}

	// Mise à jour de l'interface utilisateur
	update() {
		const game = this.game;
		const players = game.data.players;
		const pos = players.indexOf(this) + 1;
		const playerCard = document.querySelector(`.player-card.player-${pos}`);
		const isTurn = game.info.turn == this;

		if (!playerCard) return;
		const username = playerCard.querySelector(".row-1 .text .headline h4");
		const status = playerCard.querySelector(".row-1 .text .status span");
		

		username.innerText = this.data.username;
		status.innerText = isTurn ? "A votre tour !" : "";

		

		try {
			this.analyze();
		} catch (e) {}
	}

	// Déplace la pièce cible sur la case cible
	move(piece, square) {
		if (!piece || !square) return false;
		const board = this.game.data.board;
		// On s'assure que la pièce et la case sont des Objets
		piece = board.filterPiece(this, piece);
		square = board.filterSquare(square);

		const game = this.game; // Jeu
		const test = game.testMove(piece, square); // On teste le déplacement, et on renvoie un booléen
		const info = square.info; // Information de la case
		const isQualified = info.isMove || info.isEnemy || info.isCastle; 

		// Si le jeu n'a pas commencé
		if (!game.isReady()) return false;

		// Si vérifié et pas correctement déplacé
		if (!this.info.isReady) return false;

	
		if (this.info.isChecked) return false;


		// Si ce n'est pas son tour
		if (!this.info.isTurn) return false;

		// Si non qualifié ou non possible (déplacement, ennemi)
		if (!isQualified) return false;

		
		if (test) piece.move(square, info.isCastle);

		return test;
	}


	async getPieces() {
		let role = this.data.role; // valeur ("white", "black")
		let path = `./assets/javascript/json/${role}-pieces.json`; // Chemin du fichier json
		let data = await fetch(path); // Obtenir le contenu du fichier
		this.data.piecesData = await data.json(); // Converti les données en json
		this.info.isReady = true; // Le joueur est prêt
	}

	async setPieces() {
		const player = this; // Joueurs
		const game = this.game; // Jeu
		const pieces = this.data.pieces; 
		const piecesData = this.data.piecesData; // Données de toutes les pièces d'échecs

		const set = function (setPieceObj) {
			// Obtenir les valeur
			let { name, length, alias, position } = setPieceObj;
			let { letter: letters, number } = position;
			// Boucle à travers leurs longueur
			for (let i = 0; i < length; i++) {
				const position = `${letters[i]}${number}`; // Obtenir la position
				const obj = { name, alias, position, index: i }; // Créer les information de la pièces
				const piece = new Piece(obj, player, game); // Nouvelle pièces
				pieces.push(piece); // Insére dans un tableau la class des pièces
			}
		};

		// Boucle à travers toutes les données et génére des pièces en fonction de leur longueur (length)
		// Ansi que les règles du jeu
		piecesData.forEach(set);
	}

	async init(game) {
		this.game = game; // Initialise le jeu

		await this.getPieces(); // Obtenir toutes les données des élements des pièces
		await this.setPieces(); // Place Objet piece dans la class piece

		this.update();
	}
}

const Game = new Chess(); // game

Game.init(function () {
	this.start();
	// this.loadMatchHistory("./assets/javascript/json/matchhistory.json");
}); // initialize


