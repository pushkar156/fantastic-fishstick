# CloudOps Hub: Automated CI/CD Pipeline & Kubernetes Deployment

**TYCSE · Cloud Computing and DevOps (Continuous Assessment 2 - CCA 2)**  
*Total Marks: 10*

---

## 1. Project Overview

**CloudOps Hub** is a cloud-native, responsive web portal designed to educate users on foundational Cloud Computing (IaaS, PaaS, SaaS) and DevOps methodologies (CI/CD, Containerization, Kubernetes Orchestration).

To achieve 100% automated delivery, the application is packaged in a lightweight **Alpine Nginx** container and delivered to a **Minikube Kubernetes cluster** through an automated **Jenkins Declarative Pipeline** hosted on **AWS EC2**.

---

## 2. System Architecture

```text
+------------------+         +-------------------------------------------------------------+
|   Developer      |         |                      AWS EC2 Instance                       |
|   (Git Push)     |         |                    (Ubuntu 22.04 LTS)                       |
+--------+---------+         +-------------------------------------------------------------+
         |                                                  |
         v                                                  v
+------------------+         +------------------+   +------------------+   +---------------+
|   GitHub Repo    | ------> | Jenkins Pipeline |-->|  Docker Engine   |-->|  Docker Hub   |
| (Source + Manifests)       |  (Jenkinsfile)   |   |  (Image Build)   |   |   Registry    |
+------------------+         +--------+---------+   +------------------+   +-------+-------+
                                      |                                            |
                                      | (kubectl apply)                            | (pull)
                                      v                                            v
                             +-------------------------------------------------------------+
                             |                     Minikube Cluster                        |
                             |  Deployment (2 Replicas)  <-- Pulls from Docker Hub         |
                             |  NodePort Service: Port 30080                               |
                             +-------------------------------------------------------------+
                                                              |
                                                              v
                                              http://<EC2-PUBLIC-IP>:30080
```

---

## 3. Repository Structure

```text
├── src/
│   ├── index.html            # Main web application & live version badge
│   ├── style.css             # Responsive styling & themes
│   └── script.js             # Interactive pipeline stage explorer
├── test/
│   └── validate.sh           # Automated syntax, structure & manifest lint test
├── k8s/
│   ├── deployment.yaml       # Kubernetes Deployment (2 replicas, rolling updates)
│   └── service.yaml          # Kubernetes Service (NodePort: 30080)
├── Dockerfile                # Multi-stage production Nginx Alpine image
├── Jenkinsfile               # Declarative 7-stage CI/CD pipeline script
└── README.md                 # Deployment report and viva documentation
```

---

## 4. Pipeline Stages Explained

| Step | Stage Name | Action & Implementation |
| :--- | :--- | :--- |
| **1 & 2** | **Checkout SCM** | Jenkins pulls the latest source code from the configured GitHub repository. |
| **3** | **Build & Test** | Executes `test/validate.sh` verifying HTML/CSS/JS syntax, file integrity, Dockerfile syntax, and Kubernetes YAML definitions. |
| **4** | **Docker Build** | Builds the container using `docker build -t <hub_user>/devops-portal:${BUILD_NUMBER} -t <hub_user>/devops-portal:latest .` |
| **5** | **Push Image** | Uses Jenkins Secret Store (`withCredentials`) to log into Docker Hub securely and pushes both tagged and `:latest` images. |
| **6** | **Minikube Deployment** | Updates the image dynamically via `sed` in `k8s/deployment.yaml` and executes `kubectl apply -f k8s/`. Kubernetes performs a zero-downtime rolling update across 2 pod replicas. |
| **7** | **Verification** | Runs `kubectl rollout status` to guarantee the update finished and outputs running pods, deployments, and services. |

---

## 5. Step-by-Step Setup Guide on AWS EC2

### Step 5.1: Launch AWS EC2 Instance
* **AMI**: Ubuntu Server 22.04 LTS (64-bit x86)
* **Instance Type**: `t3.medium` (2 vCPU, 4 GiB RAM) — *Note: Do not use `t2.micro` as Minikube + Jenkins require at least 2 vCPUs and 3+ GB RAM.*
* **Storage**: 25 GB gp3
* **Security Group Inbound Rules**:
  * `22` (SSH) — Your IP
  * `8080` (Jenkins Web UI) — Anywhere (0.0.0.0/0)
  * `30080` (App NodePort) — Anywhere (0.0.0.0/0)

---

### Step 5.2: Install Docker, Jenkins, Kubectl & Minikube

SSH into your EC2 instance:
```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

#### 1. Install Docker Engine
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

#### 2. Install Jenkins
```bash
sudo apt-get install -y fontconfig openjdk-17-jre
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install -y jenkins
sudo systemctl enable --now jenkins

# Grant Jenkins permission to interact with Docker
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

#### 3. Install `kubectl` & `minikube`
```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start Minikube using Docker driver
minikube start --driver=docker --listen-address='0.0.0.0'
```

#### 4. Configure Minikube Access for Jenkins
To allow the `jenkins` user to execute `kubectl` commands against Minikube:
```bash
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp $HOME/.kube/config /var/lib/jenkins/.kube/config
sudo cp -r $HOME/.minikube /var/lib/jenkins/.minikube
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube /var/lib/jenkins/.minikube
```

---

### Step 5.3: Jenkins Credentials & Pipeline Job Setup

1. Open Jenkins in your browser: `http://<EC2-PUBLIC-IP>:8080`.
2. Retrieve initial admin password:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
3. Install **Suggested Plugins**.
4. Configure Docker Hub Credentials:
   * Navigate to: **Manage Jenkins** → **Credentials** → **System** → **Global credentials (unrestricted)** → **Add Credentials**.
   * **Kind**: `Username with password`
   * **Username**: Your Docker Hub username.
   * **Password**: Your Docker Hub Personal Access Token (or password).
   * **ID**: `dockerhub-credentials` *(Must match the ID in the Jenkinsfile)*.
5. Create Pipeline Job:
   * Click **New Item** → Enter name (e.g., `devops-portal-pipeline`) → Select **Pipeline** → Click **OK**.
   * Under **Pipeline definition**, select **Pipeline script from SCM**.
   * **SCM**: Git
   * **Repository URL**: `https://github.com/<your-username>/<your-repo-name>.git`
   * **Branch Specifier**: `*/main` (or `*/master`)
   * **Script Path**: `Jenkinsfile`
   * Click **Save**.

---

## 6. Accessing the Application

Because Minikube runs inside Docker, route NodePort traffic from Minikube to the host EC2 network:

```bash
# Run in a background tmux/screen session on EC2:
kubectl port-forward --address 0.0.0.0 service/devops-portal-service 30080:80 &
```
Now access the web portal from your web browser:
```text
http://<EC2-PUBLIC-IP>:30080
```

---

## 7. Demonstrating the Source-Code Change (Run 1 vs Run 2)

Per the rubric requirement:
> *"After the first successful run, you must change the source code, push it, and run the pipeline again to show the new version being deployed."*

### Run 1: Initial Release (v1.0.0)
1. Trigger **Build Now** in Jenkins.
2. Observe Build #1 stages passing (Checkout → Build & Test → Docker Build → Push → Deploy → Verify).
3. Access `http://<EC2-PUBLIC-IP>:30080` — App displays **`Release: v1.0.0`** with a green pulse dot.
4. Take screenshot of Jenkins stage view and running pods:
   ```bash
   kubectl get pods -l app=devops-portal
   ```

### Run 2: Automated Redeployment (v2.0.0)
1. Open `src/index.html` and update:
   ```html
   <!-- Change from v1.0.0 to v2.0.0 -->
   <span class="version-number" id="versionText">v2.0.0 (CI/CD Automated)</span>
   ```
2. Commit and push:
   ```bash
   git add src/index.html
   git commit -m "feat: upgrade to v2.0.0 with automated rolling update"
   git push origin main
   ```
3. In Jenkins, trigger **Build Now** (or auto-triggered by webhook).
4. Observe **Build #2**:
   * Pulls new commit.
   * Builds and pushes `<hub_user>/devops-portal:2`.
   * Triggers rolling update in Minikube.
5. In terminal, observe the rolling update:
   ```bash
   kubectl rollout status deployment/devops-portal
   ```
6. Refresh browser at `http://<EC2-PUBLIC-IP>:30080`: notice **`Release: v2.0.0`** is now live without downtime!

---

## 8. Viva Voce Cheat-Sheet (Frequently Asked Questions)

* **Q: Why use Docker containerization instead of deploying directly onto EC2?**  
  *A: Containers package the app, runtime, and configuration into an immutable unit, eliminating the "works on my machine" problem and guaranteeing consistency across dev, test, and production.*

* **Q: What is the purpose of the `RollingUpdate` deployment strategy in Kubernetes?**  
  *A: It allows deployment of new image versions with zero downtime by incrementally replacing old pods with new ones. `maxUnavailable: 0` ensures existing traffic is never dropped.*

* **Q: Why did you use `withCredentials` in Jenkinsfile?**  
  *A: It prevents credentials (passwords, tokens) from being stored in plaintext or leaking into the console output, masking secrets automatically.*

* **Q: What is a NodePort in Kubernetes?**  
  *A: A Service type that exposes the application on each Node's IP at a static port (between 30000–32767), allowing external traffic to reach the cluster pods.*
