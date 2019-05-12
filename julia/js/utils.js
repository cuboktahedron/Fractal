var Complex = function(re, im) {
  this.re = re;
  this.im = im;
}

Complex.prototype = {
  add: function(c) {
    return new Complex(this.re + c.re, this.im + c.im);
  },

  mul: function(c) {
    var re = this.re * c.re - this.im * c.im;
    var im = this.re * c.im + this.im * c.re;
    return new Complex(re, im);
  },

  abs: function() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  },

  abs2: function() {
    return this.re * this.re + this.im * this.im;
  },

  toString: function() {
    if (this.im >= 0) {
      return this.re + " + " + this.im + "i";
    } else {
      return this.re + " - " + -this.im + "i";
    }
  }
}

var Diagnosis = {
  elapsedTime: function(f) {
    var before = new Date();
    f();
    return new Date() - before;
  }
};
