#include <iostream>
int main() {
    for (long i = 0; i < 50L * 1024 * 1024; i++) std::cout << 'A';
    return 0;
}
