# CodeArena Execution Engine Runtimes & Dependencies

This document records the installation instructions and exact runtime versions required for the **CodeArena Execution Engine** host environment (Linux VM / WSL2 Ubuntu).

---

## 1. System Requirements & Knobs

- **OS Environment**: Linux (Ubuntu 22.04 LTS / 24.04 LTS or WSL2 Linux Kernel 5.15+)
- **CPU**: 2 cores (`EXEC_CPU_PER_JOB = 1`)
- **Memory**: ~3.5 - 4.0 GiB (`EXEC_MEMORY_MB = 256` per sandbox)
- **Cgroups**: cgroups v2 enabled (`/sys/fs/cgroup`)
- **Networking**: Disabled inside NsJail sandbox

---

## 2. Installation Commands

Run the following commands on the Linux host / WSL2 terminal to install NsJail, compilers, and runtimes:

```bash
# Update system repositories
sudo apt-get update && sudo apt-get install -y \
    build-essential \
    gcc \
    g++ \
    openjdk-17-jdk \
    python3 \
    python3-pip \
    pkg-config \
    flex \
    bison \
    libprotobuf-dev \
    protobuf-compiler \
    libnl-route-3-dev \
    git \
    cgroup-tools

# Build and Install NsJail from source
git clone https://github.com/google/nsjail.git /tmp/nsjail
cd /tmp/nsjail && make -j$(nproc)
sudo cp nsjail /usr/local/bin/nsjail
sudo chmod 4755 /usr/local/bin/nsjail
```

---

## 3. Runtime & Compiler Matrix

| Language | Tool / Compiler | Minimum Version | Installation Command |
| :--- | :--- | :--- | :--- |
| **C** | `gcc` | 11.4.0+ | `sudo apt install gcc` |
| **C++ 17** | `g++` | 11.4.0+ | `sudo apt install g++` |
| **Java 17** | `javac` / `java` | OpenJDK 17+ | `sudo apt install openjdk-17-jdk` |
| **Python 3** | `python3` | 3.10.0+ | `sudo apt install python3` |
| **Sandbox** | `nsjail` | 3.3+ | Built from source |

---

## 4. Verification Commands

Verify installations on the Linux host by executing:

```bash
gcc --version
g++ --version
javac -version
java -version
python3 --version
nsjail --version
```
