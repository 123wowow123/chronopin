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

---

Run `kubectl delete configmap env-file`

### Deploy All

Run `kubectl create -f kube/deployment.yaml` to deploy all

---

Run `kubectl delete deployment chronopin`

### Service

Run `kubectl get service`

---

Run `kubectl delete svc/chronopin-lb`


### Build & Deploy a New Version of Your App to GCP

Run `export PROJECT_ID="$(gcloud config get-value project -q)"`

Run `docker build -t us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin:latest -f Docker/Dockerfile .`

Run [gcloud] `docker -- push us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin:latest` to push to gcloud registry


(https://cloud.google.com/kubernetes-engine/docs/deploy-app-cluster)

Run `kubectl create deployment chronopin --image=us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin:latest`

Run `kubectl set image deployment/chronopin chronopin=us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin:latest`

[Images / Build History](https://console.cloud.google.com/gcr/images/chronopin-209507/GLOBAL/chronopin?project=chronopin-209507&gcrImageListsize=50)

### Get Pod Logs

Run `kubectl logs -f <pod-id>`

### GCP Cloud Build

`gcloud builds submit --region=us-west2 -t us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin -f Docker/Dockerfile .`

Run `gcloud builds submit --region=us-west2 --config cloudbuild.yaml` to use GCP Builder to build on cloud | Needs updating to new repo

[GCP Build History](https://console.cloud.google.com/cloud-build/builds?authuser=0&project=chronopin-209507)

## Docker Cleanup Commands

Run `docker system df` to see docker disk space usage

Run `docker image prune --force --all` to remove all images that are not currently in use on our system

## Pricing

[Pricing](https://cloud.google.com/compute/pricing?hl=en_US&_ga=2.195120300.-1809462848.1528116354)




## New docker doc:
https://www.elastic.co/guide/en/elasticsearch/reference/8.6/run-elasticsearch-locally.html#_send_requests_to_elasticsearch
