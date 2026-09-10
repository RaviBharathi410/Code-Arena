#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <iostream>
#include <unistd.h>
#include <errno.h>

int main() {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        std::cout << "NETWORK_BLOCKED_SOCKET_FAILED" << std::endl;
        return 0;
    }

    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(80);
    inet_pton(AF_INET, "8.8.8.8", &addr.sin_addr);

    // Attempting external connection - must fail due to isolated network namespace
    int res = connect(sock, (struct sockaddr*)&addr, sizeof(addr));
    if (res < 0) {
        std::cout << "NETWORK_BLOCKED_CONNECT_FAILED" << std::endl;
    } else {
        std::cout << "NETWORK_SUCCESS_VULNERABLE" << std::endl;
    }

    close(sock);
    return 0;
}
