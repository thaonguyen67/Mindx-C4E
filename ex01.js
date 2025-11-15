// Dau vao la mot so nguyen duong

let number = 10;
if (number % 2 === 0) {
  console.log(`${number} la so chan`);
} else {
  console.log(`${number} la so le`);
}

let myGender = "nam";

if (myGender === "nam") {
  console.log(`ban gioi tinh nam`);
} else if (myGender === "nu") {
  console.log(`ban gioi tinh nu`);
} else {
  console.log(`ban gioi tinh khac`);
}

// Nhap 1 nam bat ky sau do in ra thong bao nam nhuan

// Nhieu hon 3 cases
// Dieu kien kho bieu dien bang gia tri cu the

let day = +window.prompt("nhap ngay trong tuan dang so");

switch (day) {
  case 0:
    console.log("chu nhat");
    break;
  case 1:
    console.log("thu hai");
    break;
  case 2:
    console.log("thu ba");
    break;
  default:
    console.log("ngay con lai");
}

switch (day) {
  case 1:
  case 2:
  case 3:
  case 4:
  case 5:
    console.log("ngay trong tuan");
    break;
  case 7:
  case 0:
    console.log("ngay cuoi tuan");
    break;
  default:
    console.log("khong hop le");
}

// Phan biet mot so la so chan hay so le

let number = 10;

switch (number % 2 === 0) {
  case true:
    console.log("so chan");
    break;
  default:
    console.log("khong la so chan");
}

// falsy values: false, 0, "", null, undefined, NaN

// truthy values: tat ca cac gia tri con lai tru falsy values

console.log(boolean("Hoang")); // true

console.log(Number(true)); // 1
console.log(Number(false)); // 0
