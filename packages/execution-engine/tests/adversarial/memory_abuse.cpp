#include <cstdlib>
#include <cstring>
#include <iostream>
int main() {
    const size_t chunk = 10 * 1024 * 1024; // 10MB per step
    size_t total = 0;
    while (true) {
        char* p = (char*)malloc(chunk);
        if (!p) { std::cerr << "malloc failed at " << total / (1024*1024) << "MB\n"; return 1; }
        memset(p, 1, chunk); // force real page commit, not just address space reservation
        total += chunk;
        std::cerr << "Allocated " << total / (1024*1024) << "MB\n";
    }
}
