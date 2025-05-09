/**
 * @license
 * Copyright 2020 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.medusa',
  name: 'PromotedPurgeAgent',

  implements: [
    'foam.lang.ContextAgent',
    'foam.core.COREService'
  ],

  documentation: 'Remove promoted entries which will never be referenced again',

  javaImports: [
    'foam.lang.ContextAgent',
    'foam.lang.ContextAgentTimerTask',
    'foam.lang.FObject',
    'foam.lang.X',
    'foam.dao.DAO',
    'foam.dao.Sink',
    'static foam.mlang.MLang.AND',
    'static foam.mlang.MLang.COUNT',
    'static foam.mlang.MLang.EQ',
    'static foam.mlang.MLang.GT',
    'static foam.mlang.MLang.LT',
    'static foam.mlang.MLang.LTE',
    'static foam.mlang.MLang.MAX',
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Max',
    'foam.mlang.sink.Sequence',
    'foam.core.logger.Logger',
    'foam.core.logger.Loggers',
    'foam.core.pm.PM',
    'java.util.Timer'
  ],

  properties: [
    {
      name: 'serviceName',
      class: 'String',
      value: 'internalMedusaDAO'
    },
    {
      documentation: 'Presently Dagger service bootstraps two entries.',
      name: 'minIndex',
      class: 'Long',
      value: 2
    },
    {
      documentation: 'do not purge above this index (inclusive)',
      name: 'maxIndex',
      class: 'Long'
    },
    {
      documentation: 'Number of entries to retain for potential consensus matching.',
      name: 'retain',
      class: 'Long',
      value: 10000,
    },
    {
      name: 'timerInterval',
      class: 'Long',
      value: 5000
    },
    {
      name: 'initialTimerDelay',
      class: 'Int',
      value: 60000
    },
    {
      documentation: 'Store reference to timer so it can be cancelled, and agent restarted.',
      name: 'timer',
      class: 'Object',
      visibility: 'HIDDEN',
      networkTransient: true
    }
 ],

  methods: [
    {
      documentation: 'Start as a COREService',
      name: 'start',
      javaCode: `
      Loggers.logger(getX(), this).info("start");
      Timer timer = new Timer(this.getClass().getSimpleName(), true);
      setTimer(timer);
      timer.schedule(new ContextAgentTimerTask(getX(), this),
        getTimerInterval(),
        getTimerInterval()
      );
      `
    },
    {
      name: 'stop',
      javaCode: `
      Timer timer = (Timer) getTimer();
      if ( timer != null ) {
        Loggers.logger(getX(), this).info("stop");
        timer.cancel();
        clearTimer();
      }
      `
    },
    {
      name: 'execute',
      args: 'Context x',
      javaCode: `
      PM pm = new PM(this.getClass().getSimpleName());
      ClusterConfigSupport support = (ClusterConfigSupport) x.get("clusterConfigSupport");
      long minIndex = Math.max(getMinIndex(), ((DaggerService) x.get("daggerService")).getMinIndex());
      ReplayingInfo replaying = (ReplayingInfo) x.get("replayingInfo");
      long maxIndex = getMaxIndex();
      if ( maxIndex == 0 ) {
        maxIndex = replaying.getIndex() - getRetain();
      }
      try {
        DAO dao = (DAO) x.get(getServiceName());
        dao = dao.where(
          AND(
            GT(MedusaEntry.INDEX, getMinIndex()),
            LTE(MedusaEntry.INDEX, maxIndex),
            EQ(MedusaEntry.PROMOTED, true)
          )
        );
        Max max = (Max) MAX(MedusaEntry.INDEX);
        Count count = new Count();
        PurgeSink purgeSink = new PurgeSink(x, new foam.dao.RemoveSink(x, dao));
        Sequence seq = new Sequence.Builder(x)
          .setArgs(new Sink[] {count, max, purgeSink})
          .build();
        dao.select(seq);
        if ( count.getValue() > 0 ) {
          Loggers.logger(x, this).debug("purged", count.getValue());
        }
        setMinIndex((Long) max.getValue());
      } catch ( Throwable t ) {
        pm.error(x, t);
        Loggers.logger(x, this).error(t);
      } finally {
        pm.log(x);
      }
      `
    }
  ]
});
