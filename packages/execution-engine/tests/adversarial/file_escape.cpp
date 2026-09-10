#include <fstream>
#include <iostream>

int main() {
    // Attempting filesystem escape
    std::ofstream outfile("/etc/malicious.txt");
    if (outfile.is_open()) {
        outfile << "escaped";
        outfile.close();
    }
    return 0;
}
