class Student {
    String name;
    int age;
}

public class Main {
    public static void main(String[] args) {
        Student s1 = new Student();
        s1.name = "Alice";
        s1.age = 20;

        Student s2 = new Student();
        s2.name = "Bob";
        s2.age = 22;

        System.out.println(s1.name);
        System.out.println(s2.name);
    }
}
What is the difference between a class and an object? Then explain this code.
  *****************8
  class BankAccount {
    public double balance;
}

class BankAccount {
    private double balance;

    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
        }
    }

    public void withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
        }
    }

    public double getBalance() {
        return balance;
    }
}
“What problem happens if balance is public?”

Expected answer:
Any code can set invalid values like -500.

  ***************************

  class User {
    public int age;
}

Ask them:
“How would you prevent age = -10?”


****************8


  class MathUtil {
    int add(int a, int b) {
        return a + b;
    }

    int add(int a, int b, int c) {
        return a + b + c;
    }
}
 *************8

   Trap question

Ask:
“Can I overload by changing only return type?”

Example:

int add(int a, int b)
double add(int a, int b)


  ************8
version a
  class Engine {
    void start() {
        System.out.println("Engine started");
    }
}

class Car extends Engine {
}


veraion b

class Engine {
    void start() {
        System.out.println("Engine started");
    }
}

class Car {
    private Engine engine = new Engine();

    void startCar() {
        engine.start();
    }
}

Version B is better.

Because:

Car has an Engine, not is an Engine
this is composition, which matches real-world modeling better



  ***********88

  class Rectangle {
    private int width;
    private int height;

    Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }

    int area() {
        return width * height;
    }
}

public class Main {
    public static void main(String[] args) {
        Rectangle r = new Rectangle(5, 4);
        System.out.println(r.area());
    }
}

**********8

  interface Flyable {
    void fly();
}

class Bird implements Flyable {
    public void fly() {
        System.out.println("Bird is flying");
    }
}

class Airplane implements Flyable {
    public void fly() {
        System.out.println("Airplane is flying");
    }
}


class MySQLDatabase {
    void save() {
        System.out.println("Saved to MySQL");
    }
}

class OrderService {
    private MySQLDatabase db = new MySQLDatabase();

    void placeOrder() {
        db.save();
    }
}



const employees = [
  { name: "Alice", department: "HR" },
  { name: "Bob", department: "IT" },
  { name: "Charlie", department: "HR" },
  { name: "David", department: "IT" },
  { name: "Eva", department: "Finance" }
];

Group employees by department.

const grouped = employees.reduce((acc, employee) => {
  const dept = employee.department;

  if (!acc[dept]) {
    acc[dept] = [];
  }

  acc[dept].push(employee);
  return acc;
}, {} as Record<string, { name: string; department: string }[]>);

console.log(grouped);


    abstract class Payment {
    abstract void pay(double amount);
}

class CreditCardPayment extends Payment {
    void pay(double amount) {
        System.out.println("Paid by credit card: " + amount);
    }
}

class UpiPayment extends Payment {
    void pay(double amount) {
        System.out.println("Paid by UPI: " + amount);
    }
}


const original = {
  name: "Saif",
  address: {
    city: "San Jose"
  }
};

const copy = { ...original };
copy.address.city = "Milpitas";

console.log(original.address.city); // "Milpitas"
