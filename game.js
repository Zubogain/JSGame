'use strict';
class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	plus(vector) {
		if (!(vector instanceof Vector)) {
      		throw new Error('Переданный аргумент неверного типа!');
    	}
		return new Vector(this.x + vector.x, this.y + vector.y);
	}

	times(multiply) {
		return new Vector(this.x * multiply, this.y * multiply);
	}
}

class Actor {
	constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
		if (!(pos instanceof Vector)) {
      		throw new Error('Ошибка расположения');
    	}
    	if (!(size instanceof Vector)) {
      		throw new Error('Ошибка размера');
    	}
    	if (!(speed instanceof Vector)) {
      		throw new Error('Ошибка скорости');
    	}
		this.pos = pos;
		this.size = size;
		this.speed = speed;
	}

	act() {

	}

	get type() {
		return "actor";
	}

	get left() {
		return this.pos.x;
	}

	get top() {
		return this.pos.y;
	}

	get right() {
		return this.pos.x + this.size.x;
	}

	get bottom() {
		return this.pos.y + this.size.y;
	}

	isIntersect(actor) {
		if(!(actor instanceof Actor)) {
			throw new Error("Переданный аргумент не является экземпляром класса Vector");
		}

		if(actor === this) {
			return false;
		}
		
		if(this.left >= actor.right) {
			return false;
		}
		
		if(this.right <= actor.left) {
			return false;
		}
		
		if(this.bottom <= actor.top) {
			return false;
		}
		
		if(this.top >= actor.bottom) {
			return false;
		}
		return true;
	}
}

class Level {
	constructor(grid = null, actors = null) {
		this.grid = grid;
		this.actors = actors;
		this.height = 0;
		this.width = 0;
		if(Array.isArray(grid)) {
			for(let gridYX of grid) {
				this.height += 1;
				if(Array.isArray(gridYX)) {
					if(this.width < gridYX.length) {
						this.width = gridYX.length;
					}
				}
			}
		}
		if(Array.isArray(actors)) {
			actors.forEach(actor => {
				if(actor.type === "player") {
					this.player = actor;
				}
			});
		}
		this.status = null;
		this.finishDelay = 1;
	}

	isFinished() {
		return this.status !== null && this.finishDelay < 0 ? true: false;
	}

	actorAt(actor) {
		if(!(actor instanceof Actor)) {
			throw new Error("Переданный аргумент не является экземпляром класса Actor");
		}
		if(Array.isArray(this.actors)) {
			return this.actors.find((el) => el.isIntersect(actor));
		}
	}

	obstacleAt(position, size) {
		if(!(position instanceof Vector) || !(size instanceof Vector)) {
			throw new Error("Первый или второй аргумент не является экземпляром класса Vector");
		}

		let left = Math.floor(position.x);
    	let right = Math.ceil(position.x + size.x);
    	let top = Math.floor(position.y);
    	let bottom = Math.ceil(position.y + size.y);

		if(left < 0 || right > this.width || top < 0) {
			return "wall";
		}
		if(bottom > this.height) {
			return "lava";
		}
		for (let horizontal = left; horizontal < right; horizontal++) {
      		for (let vertical = top; vertical < bottom; vertical++) {
        		let cell = this.grid[vertical][horizontal];
        		if (cell) {
          			return cell;
        		}
      		}
    	}
	}

	removeActor(actor) {
		this.actors.forEach((el, index) => el === actor && this.actors.splice(index, 1));
	}

	noMoreActors(movingObjectType) {
		if(Array.isArray(this.actors)) {
			return this.actors.reduce((memo, el) => {
				if(el.type === movingObjectType) {
					memo = false;
					return memo;
				}
				return memo;
			}, true);
		}
		return true;
	}

	playerTouched(type, actor) {
		if(type === "lava" || type === "fireball") {
			this.status = "lost";
		}
		if(type === "coin" && actor.type === "coin") {
			this.actors.forEach((el, index) => el === actor && this.actors.splice(index, 1));
			if(!(this.actors.filter(el => el.type === "coin" && el).length)) {
				this.status = "won";
			}
		}
	}
}

class LevelParser {
	constructor(vocabulary) {
		this.vocabulary = vocabulary;
	}

	actorFromSymbol(string) {
		return !string ? undefined: this.vocabulary[string];
	}

	obstacleFromSymbol(string) {
		if(string) {
			switch(string) {
				case 'x':
					return "wall";
				case '!':
					return "lava";
			}
		}
	}

	createGrid(arrayStrings) {
		if(arrayStrings.length === 0) {
			return [];
		}
		let result = [];
		arrayStrings.forEach(el => {
			let symbolArray = el.split("");
			result.push(symbolArray.map(el => this.obstacleFromSymbol(el)));
		});
		return result;
	}

	createActors(arrayStrings) {
		if(arrayStrings.length === 0 || !(this.vocabulary)) {
			return [];
		}
		let actors = [];
		arrayStrings.forEach((property, posY) => {
			property.split("").forEach((el, posX) => {
				let object = this.actorFromSymbol(el);
				if(typeof object === "function") {
					object = new object(new Vector(posX, posY));
					if(object instanceof Actor) {
						actors.push(object);
					}
				}
			});
		});
		return actors;
	}

	parse(arrayStrings) {
		return new Level(this.createGrid(arrayStrings), this.createActors(arrayStrings));
	}
}

class Fireball extends Actor {
	constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
		super(pos, undefined, speed);
	}

	get type() {
		return "fireball";
	}

	getNextPosition(time = 1) {
		return this.pos.plus(this.speed.times(time));
	}

	handleObstacle() {
		this.speed.x = -this.speed.x;
		this.speed.y = -this.speed.y;
	}

	act(time, level) {
		const newPosition = this.getNextPosition(time);
		if(!(level.obstacleAt(newPosition, this.size))) {
			this.pos = newPosition;
		} else {
			this.handleObstacle();
		}
	}
}

class HorizontalFireball extends Fireball {
	constructor(pos) {
		super(pos, new Vector(2, 0));
	}
}

class VerticalFireball extends Fireball {
	constructor(pos) {
		super(pos, new Vector(0, 2));
	}
}

class FireRain extends Fireball {
	constructor(pos) {
		super(pos, new Vector(0, 3));
		this.defaultPos = pos;
	}

	handleObstacle() {
		this.pos = this.defaultPos;
	}
}

class Coin extends Actor {
	constructor(pos) {
		super(pos, new Vector(0.6, 0.6));
		this.pos.x += 0.2;
		this.pos.y += 0.1;
		this.springSpeed = 8;
		this.springDist = 0.07;
		this.spring = Math.floor(Math.random() * (2 * Math.PI));
	}
	
	get type() {
		return "coin";
	}

	updateSpring(time = 1) {
		this.spring += this.springSpeed * time;
	}

	getSpringVector() {
		return new Vector(0, Math.sin(this.spring) * this.springDist);
	}

	getNextPosition(time = 1) {
		this.updateSpring(time);
		return this.pos.plus(this.getSpringVector());
	}

	act(time) {
		this.pos = this.getNextPosition(time);
	}
}

class Player extends Actor {
	constructor(pos) {
		super(pos, new Vector(0.8, 1.5));
		this.pos.y -= 0.5;
	}

	get type() {
		return "player";
	}
}

const actorDict = {
  '@': Player,
  'o': Coin,
  'v': FireRain,
  '|': VerticalFireball,
  '=': HorizontalFireball
};

const parser = new LevelParser(actorDict);

loadLevels().then(levels => runGame(JSON.parse(levels), parser, DOMDisplay)).then(() => alert('Вы выиграли!'));