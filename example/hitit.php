<?php

$mongo = new Mongo('mongodb://localhost:3000');
$db = $mongo->test;
$c = $db->test;

$c->insert(array('foo'=>'bar'));

$c->update(array('foo'=>'bar'), array('foo'=>'fubar'));

iterator_to_array($c->find());

$c->count();

$c->remove();

$c->drop();
