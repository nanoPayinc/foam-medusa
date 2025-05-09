/**
 * @license
 * Copyright 2022 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
foam.CLASS({
  package: 'foam.core.medusa.sf',
  name: 'SFBroadcastDAO',
  extends: 'foam.dao.ProxyDAO',
  
  javaImports: [
    'foam.lang.FObject',
    'foam.lang.X',
    'foam.dao.DAO',
    'foam.dao.DOP',
    'foam.core.logger.PrefixLogger',
    'foam.core.logger.Logger',
    'foam.core.medusa.ClusterConfig',
    'foam.core.medusa.ClusterConfigSupport',
    'foam.core.medusa.MedusaType',
    'foam.core.medusa.Status',
    'foam.lang.Agency',
    'foam.lang.ContextAgent',
    'foam.box.sf.SFEntry',
    'foam.box.sf.SFManager'
  ],
  
  properties: [
    {
      name: 'cSpec',
      class: 'FObjectProperty',
      of: 'foam.core.boot.CSpec'
    },
    {
      name: 'threadPoolName',
      class: 'String',
      value: 'medusaThreadPool'
    },
    {
      name: 'logger',
      class: 'FObjectProperty',
      of: 'foam.core.logger.Logger',
      visibility: 'HIDDEN',
      transient: true,
      javaCloneProperty: '//noop',
      javaFactory: `
      return new PrefixLogger(new Object[] {
        this.getClass().getSimpleName(),
        getCSpec().getName()
      }, (Logger) getX().get("logger"));
      `
    }
  ],
  
  methods: [
    {
      name: 'put_',
      javaCode: `
      FObject o = getDelegate().put_(x, obj);
      broadcast(x, o, DOP.PUT);
      return o;
      `
    },
    {
      name: 'remove_',
      javaCode: `
      FObject o = getDelegate().remove_(x, obj);
      broadcast(x, o, DOP.REMOVE);
      return o;
      `
    },
    {
      documentation: 'Broadcast to mediators',
      name: 'broadcast',
      args: 'Context x, FObject obj, DOP dop',
      javaCode: `
      //Find other mediators and send.
      
      ClusterConfigSupport support = (ClusterConfigSupport) getX().get("clusterConfigSupport");
      ClusterConfig myConfig = support.getConfig(x, support.getConfigId());
      
      if ( myConfig.getType() != MedusaType.MEDIATOR || myConfig.getStatus() != Status.ONLINE ) return;
      
      final SFManager sfManager = (SFManager) x.get("sfManager");
      
      SFEntry entry = x.create(SFEntry.class);
      entry.setCSpecName(getCSpec().getName());
      entry.setDop(dop);
      entry.setObject(obj);
      
      Agency agency = (Agency) x.get(getThreadPoolName());
      for ( ClusterConfig config : support.getSfBroadcastMediators() ) {
        if ( config.getId().equals(myConfig.getId()) ) continue;
        agency.submit(x, new ContextAgent() {
          public void execute(X x) {
            try {
              DAO clientDAO = (DAO) sfManager.getSfs().get(config.getId());
              clientDAO.put((SFEntry) entry.fclone());
            } catch ( Throwable t ) {
              getLogger().error(config.getId(), t);
            }
          }
        }, this.getClass().getSimpleName());
      }
      
      return;
      `
    }
  ]
});
