FROM postgres:alpine3.23

COPY ./config/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf
COPY ./config/postgresql.conf /var/lib/postgresql/data/postgresql.conf

RUN chmod 600 /var/lib/postgresql/data/pg_hba.conf && \
    chmod 600 /var/lib/postgresql/data/postgresql.conf

EXPOSE 5432
