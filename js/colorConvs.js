'use strict';

class Rgb {
  constructor(r, g, b) {
    if (g === undefined) {
      const colorCode = r;
      this._r = parseInt(colorCode.substr(1, 2), 16);
      this._g = parseInt(colorCode.substr(3, 2), 16);
      this._b = parseInt(colorCode.substr(5, 2), 16);
    } else {
      this._r = r;
      this._g = g;
      this._b = b;
    }
  }

  static staticConstructor() {
    Rgb.MAX = 255;
  }

  get r() {
    return this._r;
  }

  get g() {
    return this._g;
  }

  get b() {
    return this._b;
  }
  
  get colorCode() {
    return '#' 
      + ('00' + this.r.toString(16)).slice(-2)
      + ('00' + this.g.toString(16)).slice(-2)
      + ('00' + this.b.toString(16)).slice(-2);
  }
}

Rgb.staticConstructor();

class Hsv {
  constructor(h, s, v) {
    this._h = h;
    this._s = s;
    this._v = v;
  }

  static staticConstructor() {
    Hsv.H_MAX_P1 = 360;
    Hsv.S_MAX = 100;
    Hsv.V_MAX = 100;
  }

  get h() {
    return this._h;
  }

  get s() {
    return this._s;
  }

  get v() {
    return this._v;
  }

  get rgb() {
    const max = Math.round(Rgb.MAX / Hsv.V_MAX * this.v);
    const min = Math.round(max - (this.s / Hsv.S_MAX) * max);
    const mdiff = max - min;
    let r, g, b;

    const hb0 = Hsv.H_MAX_P1 / 6 * 0;
    const hb1 = Hsv.H_MAX_P1 / 6 * 1;
    const hb2 = Hsv.H_MAX_P1 / 6 * 2;
    const hb3 = Hsv.H_MAX_P1 / 6 * 3;
    const hb4 = Hsv.H_MAX_P1 / 6 * 4;
    const hb5 = Hsv.H_MAX_P1 / 6 * 5;
    const hb6 = Hsv.H_MAX_P1 / 6 * 6;

    if (this.h >= hb0 && this.h < hb1) {
      r = max;
      g = Math.round((this.h / hb1) * mdiff + min);
      b = min;
    } else if (this.h >= hb1 && this.h < hb2) {
      r = Math.round(((hb2 - this.h) / hb1) * mdiff + min);
      g = max;
      b = min;
    } else if (this.h >= hb2 && this.h < hb3) {
      r = min;
      g = max;
      b = Math.round(((this.h - hb2) / hb1) * mdiff + min);
    } else if (this.h >= hb3 && this.h < hb4) {
      r = min;
      g = Math.round(((hb4 - this.h) / hb1) * mdiff + min);
      b = max;
    } else if (this.h >= hb4 && this.h < hb5) {
      r = Math.round(((this.h - hb4) / hb1) * mdiff + min);
      g = min;
      b = max;
    } else if (this.h >= hb5 && this.h < Hsv.H_MAX_P1) {
      r = max;
      g = min;
      b = Math.round(((Hsv.H_MAX_P1 - this.h) / hb1) * mdiff + min);
    }

    return new Rgb(r, g, b);
  }

  static createFromRgb(rgb) {
    let h, s, v;
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const mdiff = max - min;
    if (max === min) {
      h = 0;
    } else {
      let col1, col2, deg;
      if (rgb.r >= rgb.g && rgb.r >= rgb.b) {
        col1 = rgb.g;
        col2 = rgb.b;
        deg = 0;
      } else if (rgb.g >= rgb.r && rgb.g >= rgb.b) {
        col1 = rgb.b;
        col2 = rgb.r;
        deg = Hsv.H_MAX_P1 / 3;
      } else {
        col1 = rgb.r;
        col2 = rgb.g;
        deg = Hsv.H_MAX_P1 * 2 / 3;
      }

      h = Math.round(60 * ((col1 - col2) / mdiff) + deg + Hsv.H_MAX_P1) % Hsv.H_MAX_P1;
    }

    if (max === 0) {
      s = 0;
    } else {
      s = Math.round((mdiff / max) * Hsv.S_MAX);
    }
    v = Math.round((max / Rgb.MAX) * Hsv.V_MAX);

    return new Hsv(h, s, v);
  }
}

Hsv.staticConstructor();
