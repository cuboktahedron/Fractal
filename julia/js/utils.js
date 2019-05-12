'use strict';

class Complex {
  constructor(re, im) {
    this.re = re;
    this.im = im;
  }
  
  add(c) {
    return new Complex(this.re + c.re, this.im + c.im);
  }

  mul(c) {
    const re = this.re * c.re - this.im * c.im;
    const im = this.re * c.im + this.im * c.re;
    return new Complex(re, im);
  }

  abs() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }

  abs2() {
    return this.re * this.re + this.im * this.im;
  }

  toString() {
    if (this.im >= 0) {
      return this.re + " + " + this.im + "i";
    } else {
      return this.re + " - " + -this.im + "i";
    }
  }
};

const Diagnosis = {
  elapsedTime: function(f) {
    const before = new Date();
    f();
    return new Date() - before;
  }
};

class SimpleEventEmitter {
  constructor() {
    this.handlers = {};
  }

  on(name, handler, callerObj) {
    if (this.handlers[name] === undefined) {
      this.handlers[name] = [];
    }

    if (callerObj == null) {
      this.handlers[name].push(handler);
    } else {
      this.handlers[name].push(function(palyload) { handler.call(callerObj, palyload) });
    }
  }

  emit(name, payload) {
    for (let i = 0; i < this.handlers[name].length; i++) {
      this.handlers[name][i](payload);
    }
  }
};

const eventer  = new SimpleEventEmitter();

