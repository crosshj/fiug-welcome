/*
use?: http://teavm.org/sandbox/
use?: https://plasma-umass.org/doppio-demo/
*/

import java.util.*;

public class Fib {
  static long fib(long n) {
    if (n <= 1) return 1;
    return fib(n - 1) + fib(n - 2);
  }

  public static void main(String[] args) {
    System.out.print(fib(46));
  }
}
