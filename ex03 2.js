// "use strict";

// console.time("dem thoi gian chay code");
// let i = 0;
// for (;;) {
//   // block code
//   if (i <= 1000) {
//     console.log(i);
//   } else {
//     break;
//   }
//   i++;
// }

// console.timeEnd("dem thoi gian chay code");

// In ra so chan

let even = [];
let odd = [];

for (let j = 0; j <= 100; j++) {
  if (j % 2 === 0) {
    even.push(j);
  } else {
    odd.push(j);
  }
}

console.log(`mang cac so chan: ${even}`);
console.log(`mang cac so le: ${odd}`);
