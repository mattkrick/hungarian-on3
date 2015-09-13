# hungarian-on3
The hungarian (Kuhn-Munkres) algorithm solved in O(n^3) time
Algorithm based on: https://github.com/KevinStern/software-and-algorithms/blob/master/src/main/java/blogspot/software_and_algorithms/stern_library/optimization/HungarianAlgorithm.java

Solves an assignment problem really fast. Benchmarked against other JS solutions, a 1000x1000 matrix took about 26 seconds. With this, it takes 2 seconds.

- The primary speed up comes from using the O(n^3) algorithm instead of the O(n^4) algorithm that you probably use when you solve by hand.
- Additionally, it reduces the search space by removing rows that have no feasible column match.
- For max speed, make sure your `BIG_M` is <= 2^30 (otherwise the optimizing compiler bails out because it has to rewrap the function in a double)

##API
