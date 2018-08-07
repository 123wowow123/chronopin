# Elastic

Run `bin/elasticsearch` to start

Run `curl http://localhost:9200/` to check if running


Run below to export env variables and check health
```sh
export APP_INSTANCE_NAME=elasticsearch-chronopin
export NAMESPACE=default
```

```sh
SERVICE_IP=$(kubectl get svc $APP_INSTANCE_NAME-elasticsearch-svc \
  --namespace $NAMESPACE \
  --output jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

Run `curl http://${SERVICE_IP}:9200/_cat/health?v` to check health

---

Delete pins indexes and data:
`curl -X DELETE 'http://localhost:9200/pins'`

Delete all the indexes and data:
`curl -X DELETE 'http://localhost:9200/_all'`


# Kibana

Run `bin/kibana` to start

Point your browser at http://localhost:5601

# Logstash

Run `bin/logstash -f logstash.conf` to start

# GCP Click-To-Deploy

[ElastiSearch k8s](https://github.com/GoogleCloudPlatform/click-to-deploy/tree/master/k8s/elasticsearch)






`bin/logstash -e 'input { stdin { } } output { stdout {} }'`

`bin/logstash -f ../config/simple.conf`

Enter into stdin and see tranformed result
`LOGSTASH IS AWESOME`


See Plugin List

`bin/logstash-plugin list`

`GET /_cat/indices?v`


`kubectl rollout status deployment/chronopin-dep`




# ElastiSearch on Docker
https://www.safaribooksonline.com/library/view/learning-elastic-stack/9781787281868/e2651de0-f3e1-420b-afc6-16f77aa354bc.xhtml
https://www.elastic.co/guide/en/elasticsearch/reference/6.0/docker.html