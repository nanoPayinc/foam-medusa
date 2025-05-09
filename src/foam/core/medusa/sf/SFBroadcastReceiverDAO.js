/**
 * @license
 * Copyright 2022 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
foam.CLASS({
  package: 'foam.core.medusa.sf',
  name: 'SFBroadcastReceiverDAO',
  extends: 'foam.dao.ProxyDAO',
  
  javaImports: [
    'foam.lang.FObject',
    'foam.lang.X',
    'foam.dao.DAO',
    'foam.dao.DOP',
    'foam.core.pm.PM',
    'foam.core.logger.Loggers',
    'foam.box.sf.SFEntry'
  ],
  
  properties: [
  ],
  
  methods: [
    {
      name: 'put_',
      javaCode: `
      PM pm = PM.create(x, this.getClass().getSimpleName(), "put");
      SFEntry entry = (SFEntry) obj;
      
      try {
        DAO dao = ((DAO) x.get(entry.getCSpecName()));
        DAO mdao = (DAO) dao.cmd_(x, foam.dao.DAO.LAST_CMD);
        
        if ( DOP.PUT == entry.getDop() ) {
          FObject nu = entry.getObject();
          nu = mdao.put_(x, nu);
        } else {
          throw new UnsupportedOperationException(entry.getDop().toString());
        }
        
        return entry;
      } catch (Throwable t) {
        pm.error(x, entry, t);
        Loggers.logger(x, this).error("put", entry, t.getMessage(), t);
        throw t;
      } finally {
        pm.log(x);
      }
      `
    }
  ]
});