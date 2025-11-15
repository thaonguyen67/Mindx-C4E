let i = 0;

while (i <= 10) {
  console.log(i);
  i = i + 2;
}

// do: luon chay 1 lan truoc dieu kien
let j = 0;
do {
  console.log(j);
  j++;
} while (j <= 10);

// do while

// break/continue

// in ra so le, vi continue co nghia la neu i la so chan thi bo qua va lap lai vong lap

for (let i = 0; i <= 10; i++) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}

// tien to, hau to: ++, --

let number = 10;

// console.log(number++);// hau to: in ra truoc, thay doi sau

console.log(number--);
console.log(number); // bang 9

let number2 = 100;
// tien do: thay doi truoc, in ra sau
console.log(++number2); // 101
console.log(--number2); // 100 (vi o dong 39 la 101, nen khi chay dong 40 thi thanh lai 100)

let z = 10;
console.log(++z + z++ - z-- + --z);
// 11 + 11 -  12 + 10 = 20

1️⃣ ++z
	•	Tăng trước → z = 11
	•	Trả về 11

2️⃣ z++
	•	Trả về giá trị trước khi tăng → 11
	•	Sau đó z tăng: z = 12

3️⃣ z--
	•	Trả về giá trị trước khi giảm → 12
	•	Sau đó z giảm: z = 11

4️⃣ --z
	•	Giảm ngay lập tức → z = 10
	•	Trả về 10