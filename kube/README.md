# Google Cloud Setup

[Quickstart for macOS](https://cloud.google.com/sdk/docs/quickstart-macos)

[Container deployment](https://cloud.google.com/kubernetes-engine/docs/tutorials/hello-app)

# Credentials and configure kubectl command-line tool

If you are using an existing Kubernetes Engine cluster or if you have created a cluster through Google Cloud Platform Console, you need to run the following command to retrieve cluster credentials and configure kubectl command-line tool with them:

Run `gcloud container clusters get-credentials chronopin-cluster`

# Set Project ID to Local variable

Run `export PROJECT_ID="$(gcloud config get-value project -q)"` set to chronopin-209507

# Set Project Env Variables 

Run `kubectl create configmap env-file --from-env-file=Docker/env.prod.list`

# Build Image for Google Cloud

Run `docker build -t gcr.io/${PROJECT_ID}/chronopin:latest -f Docker/Dockerfile .`

# Push Image to Google Cloud

Run `gcloud docker -- push gcr.io/${PROJECT_ID}/chronopin:latest` to push to gcloud registry


### Deploy All

Run `kubectl create -f kube/deployment.yaml` to deploy all

---

Run `kubectl delete deployment chronopin-dep`

### Service

Run `kubectl get service`

---

Run `kubectl delete svc/chronopin-lb`


### Deploy a new version of your app

Run `docker build -t gcr.io/${PROJECT_ID}/chronopin:latest -f Docker/Dockerfile .`

Run `gcloud docker -- push gcr.io/${PROJECT_ID}/chronopin:latest` to push to gcloud registry

Run `kubectl set image deployment/chronopin-dep website=gcr.io/${PROJECT_ID}/chronopin:latest`