/**
 * @license
 * Copyright 2021 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.medusa',
  name: 'MedusaHealthFactory',

  javaImplements: [
    'foam.lang.XFactory'
  ],

  documentation: 'Context Factory for generating Medusa specific Health instances',

  methods: [
    {
      name: 'create',
      args: 'Context x',
      type: 'Object',
      javaCode: 'return new MedusaHealth(x);'
    }
  ]
});
