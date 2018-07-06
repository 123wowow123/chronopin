#!/bin/bash

kubectl create -f kube/deployment.yaml

minikube service chronopin-lb