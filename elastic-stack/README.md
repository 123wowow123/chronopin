# Elastic

Run `bin/elasticsearch` to start

Run `curl http://localhost:9200/` to check if running

---

Delete all the indexes and data:
`curl -X DELETE 'http://localhost:9200/_all'`

# Kibana

Run `bin/kibana` to start

Point your browser at http://localhost:5601

# Logstash

Run `bin/logstash -f logstash.conf` to start




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